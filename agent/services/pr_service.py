import aiohttp
import jwt
import time
import os
import uuid
from datetime import datetime
import pytz
import re
from codegen import CodeAgent
from codegen.extensions.tools.github.create_pr import create_pr as github_create_pr
from ..helpers import create_codebase, format_issue_message
from ..data import Issue, AgentRunResponse
from ..config import ANTHROPIC_API_KEY, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, FRONTEND_URL
from ..db.connection import db_pool
from .comment_service import add_agent_comment, get_comments_for_issue
from .issue_service import set_issue_in_review
from .repository_service import get_repository_language
from ..logging_config import get_logger

# Get the API server URL from environment variables
API_SERVER_URL = os.environ.get('VITE_API_SERVER_URL', 'http://localhost:3003')

# Get logger for this module
logger = get_logger(__name__)

async def get_installation_token(workspace_id):
    """Get GitHub installation token for a workspace"""
    # Get the current db_pool from the connection module
    from ..db.connection import db_pool
    
    if not db_pool:
        logger.error("Database connection pool not available. Cannot get installation token.")
        return None
        
    try:
        # Get installation from database
        async with db_pool.acquire() as conn:
            installation = await conn.fetchrow(
                """
                SELECT * FROM github_installation
                WHERE workspace_id = $1
                AND suspended = false
                ORDER BY modified DESC
                LIMIT 1
                """,
                workspace_id
            )
            
            if not installation:
                logger.error(f"No GitHub installation found for workspace {workspace_id}")
                return None
            
            # Check if token is still valid using timezone-aware comparison
            current_time = datetime.now(pytz.UTC)
            if installation['access_token'] and installation['token_expires_at']:
                # Ensure token_expires_at is timezone-aware
                expires_at = installation['token_expires_at']
                if expires_at.tzinfo is None:
                    expires_at = pytz.UTC.localize(expires_at)
                
                if expires_at > current_time:
                    return installation['access_token']
            
            # Get fresh token from GitHub

            # Create JWT for GitHub App
            now = int(time.time())
            payload = {
                'iat': now,
                'exp': now + 600,
                'iss': GITHUB_APP_ID
            }
            jwt_token = jwt.encode(payload, GITHUB_APP_PRIVATE_KEY, algorithm='RS256')
            
            # Get installation token
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {jwt_token}',
                    'Accept': 'application/vnd.github.v3+json'
                }
                # Use the API server to get the token
                url = f"{API_SERVER_URL}/token?workspace_id={workspace_id}"
                async with session.get(url) as response:
                    if response.status != 200:
                        logger.error(f"Failed to get installation token: {await response.text()}")
                        return None
                    
                    data = await response.json()
                    if 'error' in data:
                        logger.error(f"Error from external API: {data['error']}")
                        return None
                        
                    token = data['token']
                    expires_at = datetime.fromisoformat(data['expiresAt'].replace('Z', '+00:00'))
                    
                    # Update token in database
                    await conn.execute(
                        """
                        UPDATE github_installation
                        SET access_token = $1, token_expires_at = $2
                        WHERE id = $3
                        """,
                        token, expires_at, installation['id']
                    )
                    
                    return token
    except Exception as e:
        logger.error(f"Error getting installation token: {str(e)}")
        return None

async def store_github_branch(conn, issue_id, workspace_id, branch_name, pr_url):
    """Store GitHub branch information in the database"""
    logger.info(f"Storing GitHub branch in database: {branch_name} for issue {issue_id}")
    try:
        # Generate a UUID for the new record
        branch_id = str(uuid.uuid4())
        
        # Insert the record into the github_branch table
        await conn.execute(
            """
            INSERT INTO github_branch (
                id, issue_id, workspace_id, name, pull_request_link, 
                created, modified
            ) VALUES (
                $1, $2, $3, $4, $5, NOW(), NOW()
            )
            """,
            branch_id, issue_id, workspace_id, branch_name, pr_url
        )
        
        logger.info(f"Stored GitHub branch in database: {branch_id} for issue {issue_id}")
        return branch_id
    except Exception as e:
        logger.error(f"Error storing GitHub branch: {str(e)}")
        return None

async def process_issue(issue: Issue):
    """Process an issue by creating a PR"""
    # Get the current db_pool from the connection module
    from ..db.connection import db_pool
    
    # Call run_agent directly since it's now async
    result = await run_agent(issue)
    
    # Log the result
    logger.info(f"Successfully processed issue: {issue.title}, Result: {result}")
    
    # If we have issue_id and workspace_id, add a comment with the PR URL
    if issue.id and issue.workspace_id and db_pool:
        if result.status == "success":
            try:
                async with db_pool.acquire() as conn:
                    # Add PR success comment
                    pr_comment = f"✅ PR created successfully on your behalf: {result.pr_url}\n\n{result.message}"
                    await add_agent_comment(conn, issue.id, issue.workspace_id, pr_comment)
                    
                    # Update issue status to 'in_review'
                    await set_issue_in_review(conn, issue.id)
                    
                    # Store the PR in the github_branch table
                    await store_github_branch(conn, issue.id, issue.workspace_id, result.branch_name, result.pr_url)
            except Exception as comment_error:
                logger.error(f"Failed to add PR success comment or update status: {str(comment_error)}")
        else:
            try:
                async with db_pool.acquire() as conn:
                    await add_agent_comment(conn, issue.id, issue.workspace_id, result.message)
            except Exception as comment_error:
                logger.error(f"Failed to add PR error comment: {str(comment_error)}")
    
    return result

async def run_agent(issue: Issue) -> AgentRunResponse:
    """Create a PR for an issue using the Codebase agent"""
    if not ANTHROPIC_API_KEY:
        return AgentRunResponse(
            status="error",
            message="Anthropic API key not configured"
        )
    
    # Get GitHub token for this workspace
    token = await get_installation_token(issue.workspace_id)
    if not token:
        return AgentRunResponse(
            status="error",
            message="GitHub integration not configured for this workspace. Please go to [Settings](/settings) and install the GitHub App."
        )
    
    # Get the current db_pool from the connection module
    from ..db.connection import db_pool
    
    # Get repository for this issue
    repo_name = None
    if issue.github_repository_id:
        async with db_pool.acquire() as conn:
            repo = await conn.fetchrow(
                "SELECT full_name FROM github_repository WHERE id = $1",
                issue.github_repository_id
            )
            if repo:
                repo_name = repo['full_name']
    
    if not repo_name:
        return AgentRunResponse(
            status="error",
            message="GitHub repository for this issue seems to have been removed. Please select a repository in the issue details whenever you're ready to delegate this to Wallie."
        )
    
    # Get the programming language for this repository
    language = await get_repository_language(issue.github_repository_id)
    
    # Create codebase instance with the workspace token
    codebase = create_codebase(repo_name, language, token)
    
    # Get comments for this issue
    comments = []
    if issue.id and db_pool:
        try:
            async with db_pool.acquire() as conn:
                comments = await get_comments_for_issue(conn, issue.id)
                logger.info(f"Retrieved {len(comments)} comments for issue {issue.id}")
        except Exception as e:
            logger.error(f"Error retrieving comments for issue {issue.id}: {str(e)}")
    

    # Format the issue message with comments
    query = format_issue_message(issue.title, issue.description, comments)
    
    # Initialize the agent and potential branch name
    agent = CodeAgent(codebase)
    branch_name = None
    try:
        agent_result = agent.run(query)
        logger.info(f"Agent result: {agent_result}")

        # Create the PR
        pr_title = issue.title
        pr_body = f"This PR was automatically created by Wallie :robot:"
        pr_body += f"\n\nIssue: [{issue.title}]({FRONTEND_URL}/issue/{issue.id})"
        if issue.description:
            pr_body += f"\n\nDescription: {issue.description}"

        branch_name = f"wallie/{re.sub(r'[^a-z0-9-]', '-', pr_title.lower())}"
        
        # TODO: Start passing in branch name to github_create_pr
        create_pr_result = github_create_pr(codebase, pr_title, pr_body)
        logger.info(f"PR created: {create_pr_result.model_dump_json()}")
        
    except Exception as e:
        logger.error(f"Error running agent: {str(e)}")
        raise
    finally:
        # Reset the codebase
        codebase.reset()
    
    if create_pr_result.status == "success":
        return AgentRunResponse(
            status="success",
            pr_url=create_pr_result.url,
            branch_name=branch_name,
            message=agent_result
        )
    else:
        return AgentRunResponse(
            status="error",
            message=agent_result
        )
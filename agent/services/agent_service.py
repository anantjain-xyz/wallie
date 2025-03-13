import aiohttp
import jwt
import time
import os
import uuid
from datetime import datetime
import pytz
import re
from codegen import CodeAgent
from ..helpers import create_codebase, format_issue_message
from ..data import Issue, AgentRunResponse
from ..config import ANTHROPIC_API_KEY, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, FRONTEND_URL
from ..db.connection import db_pool
from .comment_service import add_agent_comment, get_comments_for_issue
from .issue_service import set_issue_in_review
from .repository_service import get_repository_language
from ..logging_config import get_logger
from dataclasses import dataclass
from typing import Optional

# Get the API server URL from environment variables
API_SERVER_URL = os.environ.get('VITE_API_SERVER_URL', 'http://localhost:3003')

# Get logger for this module
logger = get_logger(__name__)

@dataclass
class CodebaseSetupResult:
    """Result of setting up a codebase and branch for an agent to work on"""
    codebase: Optional[object] = None
    branch_name: Optional[str] = None
    pr_url: Optional[str] = None
    error_message: Optional[str] = None
    
    @property
    def is_success(self) -> bool:
        """Return True if setup was successful (no error message)"""
        return self.error_message is None

async def process_issue(issue: Issue):
    """Process an issue"""
    # Get the current db_pool from the connection module
    from ..db.connection import db_pool
    
    result = await _run_agent(issue)
    
    # Log the result
    logger.info(f"Successfully processed issue: {issue.title}, Result: {result}")

    if result.status == "success":
        try:
            async with db_pool.acquire() as conn:
                # Add PR success comment
                pr_comment = f"✅ PR {'created' if result.was_pr_created else 'updated'} on your behalf: {result.pr_url}\n\n{result.message}"
                await add_agent_comment(conn, issue.id, issue.workspace_id, pr_comment)
                
                # Update issue status to 'in_review'
                await set_issue_in_review(conn, issue.id)
                
                # Store the PR in the github_branch table
                if result.pr_url and result.was_pr_created:
                    await _store_github_branch(conn, issue.id, issue.workspace_id, result.branch_name, result.pr_url)
        except Exception as comment_error:
            logger.error(f"Failed to add PR success comment, update status, or store github branch: {str(comment_error)}")
    else:
        try:
            async with db_pool.acquire() as conn:
                await add_agent_comment(conn, issue.id, issue.workspace_id, result.message)
        except Exception as comment_error:
            logger.error(f"Failed to add PR error comment: {str(comment_error)}")
    
    return result

async def _run_agent(issue: Issue) -> AgentRunResponse:
    """Create a PR for an issue using the Codebase agent"""
    # Check for API key
    if not ANTHROPIC_API_KEY:
        return AgentRunResponse(
            status="error",
            message="Anthropic API key not configured"
        )
    
    # Get the issue comments and create the prompt
    prompt = await _prepare_agent_prompt(issue)
    
    # Setup codebase and branch
    setup_result = await _setup_codebase_and_branch(issue)
    if not setup_result.is_success:
        return AgentRunResponse(
            status="error",
            message=setup_result.error_message
        )
    
    # Run the agent
    try:
        agent = CodeAgent(setup_result.codebase)
        agent_result = agent.run(prompt)
        logger.info(f"Agent result: {agent_result}")
    except Exception as e:
        error_msg = f"Error running agent: {str(e)}"
        logger.error(error_msg)
        raise  # Re-raise to allow caller to handle the exception
    
    # Handle post-agent tasks (commit, push, create/update PR)
    return await _commit_changes_and_create_pr(
        setup_result.codebase, 
        issue, 
        agent_result, 
        setup_result.branch_name, 
        setup_result.pr_url
    )

async def _get_installation_token(workspace_id):
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

async def _setup_codebase_and_branch(issue: Issue) -> CodebaseSetupResult:
    """Set up codebase and branch for the agent to work on"""
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
        return CodebaseSetupResult(
            error_message="GitHub repository for this issue seems to have been removed. Please select a repository in the issue details whenever you're ready to delegate this to Wallie."
        )

    # Get the branch name of the last PR for this issue from the database
    branch_name = None
    pr_url = None

    try: 
        async with db_pool.acquire() as conn:
            result = await conn.fetchrow(
                "SELECT name, pull_request_link FROM github_branch WHERE issue_id = $1 ORDER BY modified DESC LIMIT 1",
                issue.id
            )
            if result:
                branch_name, pr_url = result
    except Exception as e:
        logger.error(f"Error retrieving branch name for issue {issue.id}: {str(e)}")

    if branch_name is None:
        branch_name = f"wallie/{re.sub(r'[^a-z0-9-]', '-', issue.title.lower())}"

    # Get the programming language for this repository
    language = await get_repository_language(issue.github_repository_id)

    # Get GitHub token for this workspace
    token = await _get_installation_token(issue.workspace_id)
    if not token:
        return CodebaseSetupResult(
            error_message="GitHub integration not configured for this workspace. Please go to [Settings](/settings) and install the GitHub App."
        )

    # Create codebase instance with the workspace token
    codebase = create_codebase(repo_name, language, token)

    # Checkout the branch
    codebase.checkout(branch=branch_name, create_if_missing=True, remote = True if pr_url else False)
    
    return CodebaseSetupResult(
        codebase=codebase,
        branch_name=branch_name,
        pr_url=pr_url
    )

async def _prepare_agent_prompt(issue: Issue) -> str:
    """Prepare the prompt for the agent based on issue and comments"""
    # Get the current db_pool from the connection module
    from ..db.connection import db_pool
    
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
    return format_issue_message(issue.title, issue.description, comments)

def _create_pr_body(issue: Issue) -> str:
    """Create the body text for a pull request"""
    pr_body = f"This PR was automatically created by Wallie :robot:"
    pr_body += f"\n\nIssue: [{issue.title}]({FRONTEND_URL}/issue/{issue.id})"
    
    if issue.description:
        pr_body += f"\n\nDescription: {issue.description}"
        
    return pr_body

async def _commit_changes_and_create_pr(
    codebase, 
    issue: Issue, 
    agent_result: str, 
    branch_name: str, 
    pr_url: Optional[str]
) -> AgentRunResponse:
    """Commit changes to the branch and create or update a PR"""
    # Commit and push changes
    try:
        codebase.git_commit("Vibing...")
        codebase.git_push()
    except Exception as e:
        error_msg = f"Error committing and pushing to remote: {str(e)}"
        logger.error(error_msg)
        return AgentRunResponse(
            status="error",
            message=error_msg
        )
    
    # If PR already exists, just update it
    if pr_url is not None:
        logger.info(f"PR updated: {pr_url}")
        return AgentRunResponse(
            status="success",
            pr_url=pr_url,
            branch_name=branch_name,
            was_pr_created=False,
            message=agent_result
        )
    
    # Create a new PR
    try:
        pr_title = issue.title
        pr_body = _create_pr_body(issue)
        
        create_pr_result = codebase.github.remote_git_repo.create_pull(
            head_branch_name=codebase.github.git_cli.active_branch.name,
            base_branch_name=codebase.github.default_branch,
            title=pr_title,
            body=pr_body,
        )
        logger.info("PR created successfully")
        
        return AgentRunResponse(
            status="success",
            pr_url=create_pr_result.html_url,
            branch_name=branch_name,
            was_pr_created=True,
            message=agent_result
        )
    except Exception as e:
        error_msg = f"Error creating PR: {str(e)}"
        logger.error(error_msg)
        return AgentRunResponse(
            status="error",
            message=error_msg
        )

async def _store_github_branch(conn, issue_id, workspace_id, branch_name, pr_url):
    """Store GitHub branch information in the database"""
    logger.info(f"Storing GitHub branch in database: {branch_name} for issue {issue_id}")
    try:
        # Generate a UUID for the new record
        branch_id = str(uuid.uuid4())
        
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

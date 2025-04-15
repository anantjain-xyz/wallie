import aiohttp
import jwt
import time
import os
import uuid
from datetime import datetime
import pytz
import re
import asyncio
import threading
from agent.codegen.agents.code_agent import CodeAgent
from agent.codegen.agents.data import BaseMessage
from agent.codegen.agents.loggers import ExternalLogger
from codegen.configs.models.secrets import SecretsConfig
from codegen import Codebase
from typing import Any, Dict, Union
from ..data import Issue, AgentRunResponse
from ..config import ANTHROPIC_API_KEY, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, FRONTEND_URL
from ..prompts import get_code_mode_prompt, get_project_mode_prompt
from ..db.connection import db_pool
from .comment_service import add_agent_comment, get_comments_for_issue
from .issue_service import set_issue_in_review, update_issue_plan, update_issue_design
from .repository_service import get_repository_language
from .agent_run_service import create_agent_run, set_agent_run_status
from .agent_run_message_service import store_agent_run_message, AgentRunMessageRecorder
from ..logging_config import get_logger
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

# Get the API server URL from environment variables
API_SERVER_URL = os.environ.get('VITE_API_SERVER_URL', 'http://localhost:3003')

# Get logger for this module
logger = get_logger(__name__)

async def get_agent_user_id(conn, workspace_id: UUID):
    """Get the agent user ID for the given workspace"""
    try:
        agent_user_query = """
            SELECT id FROM app_user 
            WHERE username = 'wallie'
            AND workspace_id = $1
            LIMIT 1
        """
        agent_user_id = await conn.fetchval(agent_user_query, workspace_id)
        
        if not agent_user_id:
            logger.error(f"Agent user not found in workspace {workspace_id}")
            raise Exception(f"Agent user not found in workspace {workspace_id}")
        
        return agent_user_id
    except Exception as e:
        logger.error(f"Error getting agent user ID: {str(e)}")
        raise

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

    result = await _run_agent(issue)
    
    # Log the result
    logger.info(f"Successfully processed issue: {issue.title}, Result: {result}")

    # Get the current db_pool from the connection module
    from ..db.connection import db_pool
    
    if result.status == "success":
        try:
            async with db_pool.acquire() as conn:
                if issue.is_project_mode:
                    pr_comment = f"✅ Project planning complete. I have updated the design and plan with the architecture, components, interfaces, data models, milestones, and tasks. You can now review the design and plan, edit if needed, and then click 'Approve' to convert tasks into issues."
                else:
                    # This is a code task, so we need to add a comment with the result
                    if result.pr_url is None:
                        pr_comment = f"{result.message}"
                    else:
                        # Add PR success comment
                        pr_comment = f"✅ PR {'created' if result.was_pr_created else 'updated'}: {result.pr_url}"
                        pr_comment += f"\n\n{result.message}"
                
                await add_agent_comment(conn, issue.id, issue.workspace_id, pr_comment)
                
                # Store the PR in the github_branch table
                if result.pr_url and result.was_pr_created:
                    await _store_github_branch(conn, issue.id, issue.workspace_id, result.branch_name, result.pr_url)

                # Update issue status to 'in_review'
                await set_issue_in_review(conn, issue.id)
                
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
    agent_run_id = None
    message_recorder = None
    
    try:
        # Check for API key
        if not ANTHROPIC_API_KEY:
            return AgentRunResponse(
                status="error",
                message="Anthropic API key not configured"
            )
        
        # Get the issue comments and create the prompt
        prompt = await _prepare_agent_prompt(issue)

        model_provider = "anthropic"
        model_name = "claude-3-7-sonnet-latest"

        # Create agent run record
        from ..db.connection import db_pool
        
        async with db_pool.acquire() as conn:
            # Get the agent user ID
            app_user_id = await get_agent_user_id(conn, issue.workspace_id)
            
            # Create a new agent run record
            agent_run_id = await create_agent_run(
                conn, issue.id, app_user_id, issue.workspace_id, 
                model_provider, model_name
            )
            
            # Store the initial prompt as a message
            await store_agent_run_message(conn, agent_run_id, issue.workspace_id, prompt, "prompt")
        
        # if issue.is_project_mode:
        #     model_provider = "openai"
        #     model_name = "o1"
        
        # Setup codebase and branch
        setup_result = await _setup_codebase_and_branch(issue)
        if not setup_result.is_success:
            # Update the agent run record with failure status
            async with db_pool.acquire() as conn:
                await set_agent_run_status(conn, agent_run_id, "error")
                await store_agent_run_message(
                    conn, agent_run_id, issue.workspace_id, 
                    setup_result.error_message, "error"
                )
                
            return AgentRunResponse(
                status="error",
                message=setup_result.error_message
            )
        
        # Create the message recorder
        message_recorder = AgentRunMessageRecorder(agent_run_id, issue.workspace_id)
        
        # Run the agent
        try:
            agent = CodeAgent(setup_result.codebase,
                            model_provider=model_provider,
                            model_name=model_name,
                            logger=message_recorder)
            agent_result = agent.run(prompt)
            logger.info(f"Agent result: {agent_result}")
            
            # Update agent run with success status and save any remaining messages
            async with db_pool.acquire() as conn:
                # Save any messages that haven't been flushed yet
                await message_recorder.save_remaining_messages(conn)
                
                await set_agent_run_status(conn, agent_run_id, "success")
                await store_agent_run_message(
                    conn, agent_run_id, issue.workspace_id, 
                    agent_result, "response"
                )
        except Exception as e:
            error_msg = f"Error running agent: {str(e)}"
            logger.error(error_msg)
            
            # Update agent run with error status
            async with db_pool.acquire() as conn:
                # Save any messages that haven't been flushed yet
                if message_recorder:
                    await message_recorder.save_remaining_messages(conn)
                
                await set_agent_run_status(conn, agent_run_id, "error")
                await store_agent_run_message(
                    conn, agent_run_id, issue.workspace_id, 
                    error_msg, "error"
                )
                    
            raise  # Re-raise to allow caller to handle the exception
        
        if issue.is_project_mode:
            design_section = None
            plan_section = None
            
            milestones_index = agent_result.find("### Milestones")
            if milestones_index >= 0:
                design_section = agent_result[:milestones_index].strip()
                plan_section = agent_result[milestones_index:].strip()
            else:
                design_section = agent_result.strip()
                plan_section = None
            
            async with db_pool.acquire() as conn:
                if design_section:
                    await update_issue_design(conn, issue.id, design_section)
                if plan_section:
                    await update_issue_plan(conn, issue.id, plan_section)
            
            return AgentRunResponse(
                status="success",
                message=agent_result
            )
        
        # If not in project mode, handle post-agent tasks (commit, push, create/update PR)
        pr_result = await _commit_changes_and_create_pr(
            setup_result.codebase, 
            issue, 
            agent_result, 
            setup_result.branch_name, 
            setup_result.pr_url
        )
        
        # Update the agent run with PR information if available
        if pr_result.status == "success" and pr_result.pr_url:
            async with db_pool.acquire() as conn:
                # Store the PR info as a message
                pr_info = f"PR URL: {pr_result.pr_url}, Branch: {pr_result.branch_name}"
                await store_agent_run_message(
                    conn, agent_run_id, issue.workspace_id, 
                    pr_info, "pr_info"
                )
        
        return pr_result
        
    except Exception as e:
        error_msg = f"Unhandled error in agent run: {str(e)}"
        logger.error(error_msg)
        
        if agent_run_id:
            try:
                async with db_pool.acquire() as conn:
                    # Save any messages that haven't been flushed yet
                    if message_recorder:
                        await message_recorder.save_remaining_messages(conn)
                    
                    await set_agent_run_status(conn, agent_run_id, "error")
                    await store_agent_run_message(
                        conn, agent_run_id, issue.workspace_id, 
                        error_msg, "error"
                    )
            except Exception as inner_e:
                logger.error(f"Failed to update agent run status to error: {str(inner_e)}")
        
        return AgentRunResponse(
            status="error",
            message=error_msg
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
        branch_name = f"wallie/{issue.external_id}/{re.sub(r'[^a-z0-9-]', '-', issue.title.lower())}"

    # Get the programming language for this repository
    language = await get_repository_language(issue.github_repository_id)

    # Get GitHub token for this workspace
    token = await _get_installation_token(issue.workspace_id)
    if not token:
        return CodebaseSetupResult(
            error_message="GitHub integration not configured for this workspace. Please go to [Settings](/settings) and install the GitHub App."
        )

    # Create codebase instance with the workspace token
    codebase = Codebase.from_repo(
        repo_name,
        tmp_dir=f"/tmp/{issue.id}/",
        language=language,
        secrets=SecretsConfig(github_token=token)
    )

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
    
    if issue.is_project_mode:
        return get_project_mode_prompt(issue.title, issue.description, comments)
    else:
        return get_code_mode_prompt(issue.title, issue.description, comments)

def _format_external_id(workspace_name: str, external_id: int) -> str:
    prefix = workspace_name[:3].upper()
    return f"{prefix}-{external_id}"

def _create_pr_body(issue: Issue, workspace_name: str) -> str:
    """Create the body text for a pull request"""
    pr_body = f"This PR was automatically created by Wallie :robot:"
    formatted_id = _format_external_id(workspace_name, issue.external_id)
    pr_body += f"\n\nIssue: [{issue.title}]({FRONTEND_URL}/issue/{formatted_id})"
    
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
        codebase.ctx.commit_transactions(sync_graph=False)

        codebase.github.git_cli.git.add(A=True)
        # Unstage the excluded paths
        for path in [".codegen"]:
            try:
                codebase.github.git_cli.git.reset("HEAD", "--", path)
            except Exception as e:
                logger.warning(f"Failed to exclude path {path}: {e}")

        # Get the staged changes
        staged_changes = codebase.github.git_cli.git.diff('--staged')

        git_commit_result = None
        if staged_changes:
            commit_args = ["-m", "."]
            commit_args.append("--author='Wallie <bot@wallie.app>'")
            codebase.github.git_cli.git.commit(*commit_args)
            git_commit_result = True
        else:
            logger.info("No changes to commit. Do nothing.")
            git_commit_result = False

        if not git_commit_result:
            logger.info("No changes to commit, returning early")
            return AgentRunResponse(
                status="success",
                pr_url=pr_url,
                branch_name=branch_name,
                was_pr_created=False,
                message=agent_result
            )
        
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
        # Get the current db_pool from the connection module
        from ..db.connection import db_pool
        
        async with db_pool.acquire() as conn:
            workspace_name = await conn.fetchval(
                "SELECT name FROM workspace WHERE id = $1",
                issue.workspace_id
            )

        pr_body = _create_pr_body(issue, workspace_name)
        
        create_pr_result = codebase.github.remote_git_repo.create_pull(
            head_branch_name=codebase.github.git_cli.active_branch.name,
            base_branch_name=codebase.github.default_branch,
            title=pr_title,
            body=pr_body,
        )

        # Check if create_pr_result is None before accessing html_url
        if create_pr_result is None:
            logger.error("PR creation returned None instead of a PR object")
            return AgentRunResponse(
                status="error",
                message="Error creating PR: GitHub API returned None",
                branch_name=branch_name,
                was_pr_created=False
            )
        
        logger.info(f"PR created: {create_pr_result.html_url}")
        
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

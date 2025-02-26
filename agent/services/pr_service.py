from codegen import CodeAgent
from codegen.extensions.tools.github.create_pr import create_pr as github_create_pr
from ..helpers import create_codebase, format_ticket_message
from ..data import TicketRequest, PRResponse
from ..config import logger, GITHUB_TOKEN, ANTHROPIC_API_KEY, GITHUB_REPO, PROGRAMMING_LANGUAGE
from ..db.connection import db_pool
from .comment_service import add_agent_comment
from .issue_service import set_issue_in_review
import asyncio

async def process_ticket(ticket: TicketRequest, issue_id=None, workspace_id=None):
    """Process a ticket by creating a PR"""
    try:
        # This calls our existing function but in an async context
        result = await asyncio.to_thread(create_pr, ticket)
        logger.info(f"Successfully processed ticket: {ticket.title}, PR: {result.pr_url}")
        
        # Get the current db_pool from the connection module
        from ..db.connection import db_pool
        
        # If we have issue_id and workspace_id, add a comment with the PR URL
        if issue_id and workspace_id and db_pool:
            try:
                async with db_pool.acquire() as conn:
                    # Add PR success comment
                    pr_comment = f"✅ PR created successfully: {result.pr_url}"
                    await add_agent_comment(conn, issue_id, workspace_id, pr_comment)
                    
                    # Update issue status to 'in_review'
                    await set_issue_in_review(conn, issue_id)
                    logger.info(f"Updated issue {issue_id} status to 'in_review'")
            except Exception as comment_error:
                logger.error(f"Failed to add PR success comment or update status: {str(comment_error)}")
        
        return result
    except Exception as e:
        logger.error(f"Error processing ticket: {str(e)}")
        
        # Get the current db_pool from the connection module
        from ..db.connection import db_pool
        
        # If we have issue_id and workspace_id, add a comment about the error
        if issue_id and workspace_id and db_pool:
            try:
                async with db_pool.acquire() as conn:
                    error_comment = f"⛔ Error creating PR: {str(e)}"
                    await add_agent_comment(conn, issue_id, workspace_id, error_comment)
            except Exception as comment_error:
                logger.error(f"Failed to add PR error comment: {str(comment_error)}")
        
        raise

def create_pr(request: TicketRequest) -> PRResponse:
    """Create a PR for a ticket using the Codebase agent"""
    if not GITHUB_TOKEN:
        raise Exception("GitHub token not configured")
    
    if not ANTHROPIC_API_KEY:
        raise Exception("Anthropic API key not configured")
    
    # Create codebase instance
    codebase = create_codebase(GITHUB_REPO, PROGRAMMING_LANGUAGE)
    
    # Format the ticket message
    query = format_ticket_message(request.title, request.description)
    
    # Create and run the agent
    agent = CodeAgent(codebase)
    agent.run(query)
    
    # Create the PR
    pr_title = request.title
    pr_body = f"Automatically generated PR for: {request.title}\n\n"
    if request.description:
        pr_body += f"Description: {request.description}"
    
    create_pr_result = github_create_pr(codebase, pr_title, pr_body)
    logger.info(f"PR created: {create_pr_result.model_dump_json()}")
    
    # Reset the codebase
    codebase.reset()
    
    return PRResponse(
        status="success",
        pr_url=create_pr_result.url,
        message="PR created successfully"
    ) 
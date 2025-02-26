import asyncio
from ..config import logger, POLLING_INTERVAL_SECONDS, ERROR_RETRY_SECONDS
from ..db.connection import db_pool, get_db
from ..db.queries import get_latest_issue_timestamp, get_new_issues
from ..data import TicketRequest
from .comment_service import add_agent_comment
from .issue_service import set_issue_in_progress
from .pr_service import process_ticket

# Global variable to store the last checked timestamp
last_checked_timestamp = None

async def monitor_issues():
    """Background task to monitor for new issues in the database"""
    global last_checked_timestamp
    
    # Get the current db_pool from the connection module
    from ..db.connection import db_pool
    
    if not db_pool:
        logger.error("Database connection pool not available. Cannot monitor issues.")
        return
    
    logger.info("Starting issue monitoring task")
    
    # Get the latest timestamp on startup
    try:
        last_checked_timestamp = await get_latest_issue_timestamp()
        if last_checked_timestamp:
            logger.info(f"Starting issue monitoring from timestamp: {last_checked_timestamp}")
    except Exception as e:
        logger.error(f"Error initializing issue monitoring: {str(e)}")
    
    # Continuous monitoring loop
    while True:
        try:
            await asyncio.sleep(POLLING_INTERVAL_SECONDS)
            await check_for_new_issues()
        except Exception as e:
            logger.error(f"Error in issue monitoring: {str(e)}")
            await asyncio.sleep(ERROR_RETRY_SECONDS)

async def check_for_new_issues():
    """Check for new issues and process them"""
    global last_checked_timestamp
    
    # Get the current db_pool from the connection module
    from ..db.connection import db_pool
    
    if not db_pool:
        logger.error("Database connection pool not available. Cannot check for new issues.")
        return
    
    try:
        rows = await get_new_issues(last_checked_timestamp)
        
        if rows:
            logger.info(f"Found {len(rows)} new issues")
            
            for row in rows:
                issue_id = row['id']
                title = row['title']
                description = row['description'] or ""
                created = row['created']
                workspace_id = row['workspace_id']
                
                # Process the new issue
                logger.info(f"Processing new issue {issue_id} created at {created}: {title}")
                
                # Create a ticket request
                ticket = TicketRequest(title=title, description=description)
                
                try:
                    # Update issue status to in_progress and add a comment
                    async with db_pool.acquire() as conn:
                        # First set the status to in_progress
                        await set_issue_in_progress(conn, issue_id)
                        logger.info(f"Updated issue {issue_id} status to 'in_progress'")
                        
                        # Then add the comment
                        await add_agent_comment(conn, issue_id, workspace_id, "⏱️ On it, will create a PR soon.")
                    
                    # Process the ticket asynchronously
                    await process_ticket(ticket, issue_id, workspace_id)
                    
                    # Update the last checked timestamp
                    if last_checked_timestamp is None or created > last_checked_timestamp:
                        last_checked_timestamp = created
                
                except Exception as e:
                    logger.error(f"Error processing issue {issue_id}: {str(e)}")
                    # Add error comment if there was a problem
                    try:
                        async with db_pool.acquire() as conn:
                            await add_agent_comment(conn, issue_id, workspace_id, f"⛔ Error processing this issue: {str(e)}")
                    except Exception as comment_error:
                        logger.error(f"Failed to add error comment: {str(comment_error)}")
    
    except Exception as e:
        logger.error(f"Error checking for new issues: {str(e)}")

def start_issue_monitor():
    """Start the issue monitoring task"""
    asyncio.create_task(monitor_issues()) 
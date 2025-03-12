import asyncio
from ..config import POLLING_INTERVAL_SECONDS, ERROR_RETRY_SECONDS
from ..logging_config import get_logger
from ..db.connection import db_pool, get_db
from ..db.queries import get_last_modified_issue_timestamp, get_new_issues
from ..data import Issue
from .comment_service import add_agent_comment, is_last_comment_from_wallie
from .issue_service import set_issue_in_progress
from .pr_service import process_issue
import pytz
from datetime import datetime

# Get logger for this module
logger = get_logger(__name__)

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
        last_checked_timestamp = await get_last_modified_issue_timestamp()
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
        
        for row in rows:
            logger.info(f"Found {len(rows)} new issues")
            
            issue_id = row['id']
            title = row['title']
            description = row['description'] or ""
            created = row['created']
            modified = row['modified']
            workspace_id = row['workspace_id']
            github_repository_id = row['github_repository_id']
            assignee_id = row['assignee_id']
            status = row['status']
            
            # Check if issue is in 'done' status
            if status == 'done':
                logger.info(f"Issue {issue_id} is in 'done' status, skipping")
                continue
                
            # Check if assignee is the 'wallie' user
            if assignee_id is None:
                logger.info(f"Issue {issue_id} has no assignee, skipping")
                continue
                
            # Verify the assignee is 'wallie'
            is_wallie_assignee = False
            try:
                async with db_pool.acquire() as conn:
                    wallie_check = await conn.fetchval(
                        "SELECT COUNT(*) FROM app_user WHERE id = $1 AND username = 'wallie'",
                        assignee_id
                    )
                    is_wallie_assignee = wallie_check > 0
                    
                    # Check if the last comment is from 'wallie'
                    is_last_comment_from_wallie_check = await is_last_comment_from_wallie(conn, issue_id)
                    if is_last_comment_from_wallie_check:
                        logger.info(f"Issue {issue_id} last comment is from 'wallie', skipping processing")
                        continue
            except Exception as e:
                logger.error(f"Error checking assignee or comments for issue {issue_id}: {str(e)}")
                continue
                
            if not is_wallie_assignee:
                logger.info(f"Issue {issue_id} is not assigned to 'wallie', skipping")
                continue

            # Check if GitHub repository is set
            if github_repository_id is None:
                logger.info(f"Issue {issue_id} has no GitHub repository ID, skipping")
                continue

            # Ensure modified timestamp has timezone info
            if modified.tzinfo is None:
                modified = pytz.UTC.localize(modified)
            
            # Update the last checked timestamp for this issue regardless of processing outcome
            # This prevents infinite loops if processing fails
            if last_checked_timestamp is None:
                last_checked_timestamp = modified
            elif modified > last_checked_timestamp:
                last_checked_timestamp = modified
            
            # Process the new issue
            logger.info(f"Processing new issue {issue_id} modified at {modified}: {title}")
            
            issue = Issue(
                title=title,
                description=description,
                id=issue_id,
                workspace_id=workspace_id,
                github_repository_id=github_repository_id,
                assignee_id=assignee_id,
            )
            
            try:
                # Update issue status to in_progress and add a comment
                async with db_pool.acquire() as conn:
                    # First set the status to in_progress
                    await set_issue_in_progress(conn, issue_id)
                    logger.info(f"Updated issue {issue_id} status to 'in_progress'")
                
                # Process the ticket asynchronously
                await process_issue(issue)
                
            except Exception as e:
                logger.error(f"Error processing issue {issue_id}: {str(e)}")
                # Add error comment if there was a problem
                try:
                    async with db_pool.acquire() as conn:
                        await add_agent_comment(conn, issue_id, workspace_id, f"⛔ Error processing this issue: {str(e)}")
                except Exception as comment_error:
                    logger.error(f"Failed to add error comment: {str(comment_error)}")

        # Set last checked timestamp to the max of all issues modified that were processed
        last_checked_timestamp = max(row['modified'] for row in rows) if rows else last_checked_timestamp
    except Exception as e:
        logger.error(f"Error checking for new issues: {str(e)}")

def start_issue_monitor():
    """Start the issue monitoring task"""
    asyncio.create_task(monitor_issues()) 
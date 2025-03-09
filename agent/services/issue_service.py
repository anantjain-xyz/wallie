from ..logging_config import get_logger
from typing import Optional
from uuid import UUID

# Get logger for this module
logger = get_logger(__name__)

async def update_issue_status(conn, issue_id: UUID, status: str) -> bool:
    """
    Update the status of an issue
    
    Args:
        conn: Database connection
        issue_id: ID of the issue to update
        status: New status to set (e.g., 'in_progress', 'done', etc.)
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        await conn.execute(
            "UPDATE issue SET status = $1, modified = NOW() WHERE id = $2",
            status, issue_id
        )
        logger.info(f"Updated issue {issue_id} status to {status}")
        return True
    except Exception as e:
        logger.error(f"Error updating issue status: {str(e)}")
        return False

async def set_issue_in_progress(conn, issue_id: UUID) -> bool:
    """
    Set an issue's status to 'in_progress'
    
    Args:
        conn: Database connection
        issue_id: ID of the issue to update
        
    Returns:
        bool: True if successful, False otherwise
    """
    return await update_issue_status(conn, issue_id, 'in_progress')

async def set_issue_in_review(conn, issue_id: UUID) -> bool:
    """
    Set an issue's status to 'in_review'
    
    Args:
        conn: Database connection
        issue_id: ID of the issue to update
        
    Returns:
        bool: True if successful, False otherwise
    """
    return await update_issue_status(conn, issue_id, 'in_review') 
from ..db.queries import add_comment, get_issue_comments
from ..config import logger
from uuid import UUID

async def add_agent_comment(conn, issue_id: UUID, workspace_id: UUID, body: str):
    """Add a comment from the agent to the database"""
    try:
        comment_id = await add_comment(conn, issue_id, workspace_id, body)
        return comment_id
    except Exception as e:
        logger.error(f"Error adding agent comment: {str(e)}")
        raise

async def get_comments_for_issue(conn, issue_id: UUID):
    """Get all comments for an issue"""
    try:
        comments = await get_issue_comments(conn, issue_id)
        return comments
    except Exception as e:
        logger.error(f"Error getting comments for issue: {str(e)}")
        return []

async def is_last_comment_from_wallie(conn, issue_id: UUID):
    """Check if the last comment on an issue is from the 'wallie' user"""
    try:
        query = """
            SELECT u.username
            FROM comment c
            JOIN app_user u ON c.creator_id = u.id
            WHERE c.issue_id = $1
            ORDER BY c.created DESC
            LIMIT 1
        """
        last_comment_username = await conn.fetchval(query, issue_id)
        return last_comment_username == 'wallie'
    except Exception as e:
        logger.error(f"Error checking last comment for issue {issue_id}: {str(e)}")
        return False 
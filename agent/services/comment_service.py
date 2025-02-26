from ..db.queries import add_comment
from ..config import logger

async def add_agent_comment(conn, issue_id, workspace_id, body):
    """Add a comment from the agent to the database"""
    try:
        comment_id = await add_comment(conn, issue_id, workspace_id, body)
        return comment_id
    except Exception as e:
        logger.error(f"Error adding agent comment: {str(e)}")
        raise 
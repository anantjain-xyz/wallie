from ..logging_config import get_logger
from uuid import UUID
from typing import List, Dict, Any
from ..db.connection import db_pool

# Get logger for this module
logger = get_logger(__name__)

async def add_comment(conn, issue_id: UUID, workspace_id: UUID, body: str):
    """Add a comment to an issue"""
    try:
        # Get the agent user ID - import locally to avoid circular imports
        from .agent_service import get_agent_user_id
        agent_user_id = await get_agent_user_id(conn, workspace_id)
        
        # Insert the comment
        comment_query = """
            INSERT INTO comment (id, body, creator_id, issue_id, workspace_id, modified, created)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
            RETURNING id
        """
        comment_id = await conn.fetchval(comment_query, body, agent_user_id, issue_id, workspace_id)
        
        logger.info(f"Added comment {comment_id} to issue {issue_id}")
        return comment_id
    except Exception as e:
        logger.error(f"Error adding comment: {str(e)}")
        raise

async def get_issue_comments(conn, issue_id: UUID):
    """Get all comments for an issue"""
    try:
        query = """
            SELECT c.id, c.body, c.created, c.creator_id, u.full_name as author_name, u.username as author_username
            FROM comment c
            LEFT JOIN app_user u ON c.creator_id = u.id
            WHERE c.issue_id = $1
            ORDER BY c.created ASC
        """
        rows = await conn.fetch(query, issue_id)
        logger.info(f"Retrieved {len(rows)} comments for issue {issue_id}")
        return rows
    except Exception as e:
        logger.error(f"Error getting comments for issue {issue_id}: {str(e)}")
        return []

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
        return await get_issue_comments(conn, issue_id)
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
        
async def is_last_comment_retry_request(conn, issue_id: UUID):
    """Check if the last comment contains a retry request"""
    try:
        query = """
            SELECT c.body
            FROM comment c
            WHERE c.issue_id = $1
            ORDER BY c.created DESC
            LIMIT 1
        """
        last_comment_body = await conn.fetchval(query, issue_id)
        if last_comment_body:
            retry_keywords = ["retry", "try again", "reprocess", "redo", "re-do", "re-process"]
            return any(keyword.lower() in last_comment_body.lower() for keyword in retry_keywords)
        return False
    except Exception as e:
        logger.error(f"Error checking retry request in last comment for issue {issue_id}: {str(e)}")
        return False 
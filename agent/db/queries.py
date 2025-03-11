from .connection import db_pool
from ..logging_config import get_logger
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
import pytz

# Get logger for this module
logger = get_logger(__name__)

async def get_last_modified_issue_timestamp():
    """Get the timestamp of the most recent issue modification"""
    # Get the current db_pool from the connection module
    from .connection import db_pool
    
    if not db_pool:
        logger.error("Database connection pool not available. Cannot get latest issue timestamp.")
        return None
        
    try:
        async with db_pool.acquire() as conn:
            result = await conn.fetchval("SELECT MAX(modified) FROM issue")
            # If no result, use current time with UTC timezone
            if not result:
                result = datetime.now(pytz.UTC)
            # If result is naive (no timezone), assume it's in UTC
            elif result.tzinfo is None:
                result = pytz.UTC.localize(result)
            return result
    except Exception as e:
        logger.error(f"Error getting latest issue timestamp: {str(e)}")
        return None

async def get_new_issues(timestamp):
    """Get all issues modified after the given timestamp"""
    # Get the current db_pool from the connection module
    from .connection import db_pool
    
    if not db_pool:
        logger.error("Database connection pool not available. Cannot get new issues.")
        return []
        
    try:
        async with db_pool.acquire() as conn:
            query = """
                SELECT i.id, i.title, i.description, i.created, i.modified, i.workspace_id, i.github_repository_id, i.assignee_id
                FROM issue i
                WHERE i.modified > $1 OR ($1 IS NULL)
                ORDER BY i.modified ASC
            """
            rows = await conn.fetch(query, timestamp)
            return rows
    except Exception as e:
        logger.error(f"Error getting new issues: {str(e)}")
        return []

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

async def add_comment(conn, issue_id: UUID, workspace_id: UUID, body: str):
    """Add a comment to an issue"""
    try:
        # Get the agent user ID
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
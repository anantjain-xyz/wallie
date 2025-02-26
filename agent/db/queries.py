from .connection import db_pool
from ..config import logger
from typing import Optional, List, Dict, Any
import uuid

async def get_latest_issue_timestamp():
    """Get the timestamp of the most recent issue"""
    # Get the current db_pool from the connection module
    from .connection import db_pool
    
    if not db_pool:
        logger.error("Database connection pool not available. Cannot get latest issue timestamp.")
        return None
        
    try:
        async with db_pool.acquire() as conn:
            result = await conn.fetchval("SELECT MAX(created) FROM issue")
            return result
    except Exception as e:
        logger.error(f"Error getting latest issue timestamp: {str(e)}")
        return None

async def get_new_issues(timestamp):
    """Get all issues created after the given timestamp"""
    # Get the current db_pool from the connection module
    from .connection import db_pool
    
    if not db_pool:
        logger.error("Database connection pool not available. Cannot get new issues.")
        return []
        
    try:
        async with db_pool.acquire() as conn:
            query = """
                SELECT i.id, i.title, i.description, i.created, i.workspace_id
                FROM issue i
                WHERE i.created > $1 OR ($1 IS NULL)
                ORDER BY i.created ASC
            """
            rows = await conn.fetch(query, timestamp)
            return rows
    except Exception as e:
        logger.error(f"Error getting new issues: {str(e)}")
        return []

async def get_agent_user_id(conn, workspace_id):
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
            logger.warning(f"Agent user not found in workspace {workspace_id}")
            # Create a new agent user
            agent_user_query = """
                INSERT INTO app_user (id, username, full_name, email, workspace_id)
                VALUES (gen_random_uuid(), 'wallie', 'Wallie', 'agent@wallie.app', $1)
                RETURNING id
            """
            agent_user_id = await conn.fetchval(agent_user_query, workspace_id)
        
        return agent_user_id
    except Exception as e:
        logger.error(f"Error getting agent user ID: {str(e)}")
        raise

async def add_comment(conn, issue_id, workspace_id, body):
    """Add a comment to an issue"""
    try:
        # Get the agent user ID
        agent_user_id = await get_agent_user_id(conn, workspace_id)
        
        # Insert the comment
        comment_query = """
            INSERT INTO comment (id, body, creator_id, issue_id, workspace_id)
            VALUES (gen_random_uuid(), $1, $2, $3, $4)
            RETURNING id
        """
        comment_id = await conn.fetchval(comment_query, body, agent_user_id, issue_id, workspace_id)
        
        logger.info(f"Added comment {comment_id} to issue {issue_id}")
        return comment_id
    except Exception as e:
        logger.error(f"Error adding comment: {str(e)}")
        raise 
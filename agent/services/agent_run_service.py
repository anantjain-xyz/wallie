import uuid
from typing import Optional
from ..logging_config import get_logger

# Get logger for this module
logger = get_logger(__name__)

async def create_agent_run(conn, issue_id, app_user_id, workspace_id, model_provider, model_name):
    """Create a new agent run record in the database"""
    # Generate a UUID for the new record
    agent_run_id = str(uuid.uuid4())
    
    await conn.execute(
        """
        INSERT INTO agent_run (
            id, issue_id, app_user_id, workspace_id, 
            start_time, model_provider, model_name, status, 
            created, modified
        ) VALUES (
            $1, $2, $3, $4, NOW(), $5, $6, 'started', NOW(), NOW()
        )
        """,
        agent_run_id, issue_id, app_user_id, workspace_id, 
        model_provider, model_name
    )
    
    logger.info(f"Created agent run record: {agent_run_id} for issue {issue_id}")
    return agent_run_id

async def set_agent_run_status(conn, agent_run_id, status):
    """Update the status and end_time of an agent run"""
    await conn.execute(
        """
        UPDATE agent_run 
        SET end_time = NOW(), status = $2, modified = NOW()
        WHERE id = $1
        """,
        agent_run_id, status
    )
    logger.info(f"Updated agent run {agent_run_id} status to {status}")
    return True

async def store_agent_run_message(conn, agent_run_id, workspace_id, message, message_type):
    """Store an agent run message in the database"""
    message_id = str(uuid.uuid4())
    
    await conn.execute(
        """
        INSERT INTO agent_run_message (
            id, agent_run_id, workspace_id, message, type, 
            created, modified
        ) VALUES (
            $1, $2, $3, $4, $5, NOW(), NOW()
        )
        """,
        message_id, agent_run_id, workspace_id, message, message_type
    )
    return message_id 
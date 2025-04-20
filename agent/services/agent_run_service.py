import uuid
from ..logging_config import get_logger
from ..config import FREE_TIER_AGENT_RUN_LIMIT
from .workspace_service import check_workspace_tier_and_limits, increment_successful_agent_runs

# Get logger for this module
logger = get_logger(__name__)

async def create_agent_run(conn, issue_id, app_user_id, workspace_id, model_provider, model_name):
    """Create a new agent run record in the database"""
    # Check if workspace has reached limits
    can_run, workspace_info = await check_workspace_tier_and_limits(conn, workspace_id)
    
    if not can_run:
        logger.warning(f"Cannot create agent run for workspace {workspace_id}: tier limit reached")
        return None, {
            "error": "agent_run_limit_reached",
            "message": f"Free tier limit of {FREE_TIER_AGENT_RUN_LIMIT} successful agent runs per month reached.",
            "tier": workspace_info.get("tier", "free"),
            "current_count": workspace_info.get("successful_agent_runs_this_cycle", 0),
            "limit": FREE_TIER_AGENT_RUN_LIMIT
        }
    
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
    return agent_run_id, None

async def set_agent_run_status(conn, agent_run_id, status):
    """Update the status and end_time of an agent run"""
    # First get the workspace ID and current status
    agent_run = await conn.fetchrow(
        """
        SELECT workspace_id, status
        FROM agent_run
        WHERE id = $1
        """,
        agent_run_id
    )
    
    if not agent_run:
        logger.error(f"Agent run {agent_run_id} not found when updating status")
        return False
    
    workspace_id = agent_run["workspace_id"]
    current_status = agent_run["status"]
    
    # Update the agent run status
    await conn.execute(
        """
        UPDATE agent_run 
        SET end_time = NOW(), status = $2, modified = NOW()
        WHERE id = $1
        """,
        agent_run_id, status
    )
    
    # If status is changing to "completed", increment the counter
    if status == "success" and (current_status != "success"):
        await increment_successful_agent_runs(conn, workspace_id)
    
    logger.info(f"Updated agent run {agent_run_id} status to {status}")
    return True
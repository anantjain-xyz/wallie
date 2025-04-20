import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Tuple
from ..logging_config import get_logger
from ..config import FREE_TIER_AGENT_RUN_LIMIT

# Get logger for this module
logger = get_logger(__name__)

async def get_workspace_info(conn, workspace_id) -> Optional[Dict[str, Any]]:
    """
    Get workspace information including tier and billing cycle details
    """
    workspace = await conn.fetchrow(
        """
        SELECT 
            id, name, tier, url,
            current_billing_cycle_start_date, 
            successful_agent_runs_this_cycle
        FROM workspace
        WHERE id = $1
        """,
        workspace_id
    )
    
    if not workspace:
        logger.error(f"Workspace {workspace_id} not found")
        return None
    
    return dict(workspace)

async def check_and_reset_billing_cycle(conn, workspace_id) -> bool:
    """
    Check if the billing cycle needs to be reset (30 days have passed)
    Returns True if the cycle was reset, False otherwise
    """
    workspace = await conn.fetchrow(
        """
        SELECT current_billing_cycle_start_date
        FROM workspace
        WHERE id = $1
        """,
        workspace_id
    )
    
    if not workspace:
        logger.error(f"Workspace {workspace_id} not found when checking billing cycle")
        return False
    
    current_cycle_start_date = workspace["current_billing_cycle_start_date"]
    now = datetime.now(timezone.utc)
    
    # Check if 30 days have passed since the last cycle start
    if (now - current_cycle_start_date) > timedelta(days=30):
        # Reset the billing cycle and counter
        await conn.execute(
            """
            UPDATE workspace
            SET current_billing_cycle_start_date = NOW(),
                successful_agent_runs_this_cycle = 0,
                modified = NOW()
            WHERE id = $1
            """,
            workspace_id
        )
        logger.info(f"Reset billing cycle for workspace {workspace_id}")
        return True
    
    return False

async def check_workspace_tier_and_limits(conn, workspace_id) -> Tuple[bool, Dict[str, Any]]:
    """
    Check if a workspace has reached its agent run limit based on its tier
    Returns a tuple of (can_run, workspace_info)
    """
    # First check if we need to reset the billing cycle
    await check_and_reset_billing_cycle(conn, workspace_id)
    
    # Get workspace details including tier and run count
    workspace = await conn.fetchrow(
        """
        SELECT 
            id, name, tier, 
            current_billing_cycle_start_date, 
            successful_agent_runs_this_cycle
        FROM workspace
        WHERE id = $1
        """,
        workspace_id
    )
    
    if not workspace:
        logger.error(f"Workspace {workspace_id} not found")
        return False, {}
    
    workspace_info = dict(workspace)
    
    # Check if workspace is on free tier and has reached limit
    if workspace_info["tier"] == "free" and workspace_info["successful_agent_runs_this_cycle"] >= FREE_TIER_AGENT_RUN_LIMIT:
        logger.info(f"Workspace {workspace_id} has reached agent run limit: {workspace_info['successful_agent_runs_this_cycle']}/{FREE_TIER_AGENT_RUN_LIMIT}")
        return False, workspace_info
    
    # Pro tier or free tier with available runs
    return True, workspace_info

async def increment_successful_agent_runs(conn, workspace_id):
    """
    Increment the successful agent runs counter for a workspace
    This replaces the database trigger functionality
    """
    await conn.execute(
        """
        UPDATE workspace
        SET successful_agent_runs_this_cycle = successful_agent_runs_this_cycle + 1,
            modified = NOW()
        WHERE id = $1
        """,
        workspace_id
    )
    logger.info(f"Incremented successful agent runs for workspace {workspace_id}")
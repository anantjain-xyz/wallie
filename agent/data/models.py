from typing import Optional
from pydantic import BaseModel
from uuid import UUID


class Issue(BaseModel):
    title: str
    description: Optional[str] = None
    id: UUID
    workspace_id: UUID
    github_repository_id: Optional[UUID] = None
    assignee_id: Optional[UUID] = None

class AgentRunResponse(BaseModel):
    """
    Response from the agent run process
    
    Possible status values:
    - success: PR was created successfully
    - error: An error occurred during processing
    """
    status: str  # 'success', 'error'
    pr_url: Optional[str] = None
    message: Optional[str] = None
    branch_name: Optional[str] = None
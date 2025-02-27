from typing import Optional
from pydantic import BaseModel
from uuid import UUID


class Issue(BaseModel):
    title: str
    description: Optional[str] = None
    id: UUID
    workspace_id: UUID

class AgentRunResponse(BaseModel):
    status: str
    pr_url: Optional[str] = None
    message: Optional[str] = None
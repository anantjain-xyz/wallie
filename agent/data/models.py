from typing import Optional
from pydantic import BaseModel


class AgentRunRequest(BaseModel):
    title: str
    description: Optional[str] = None


class AgentRunResponse(BaseModel):
    status: str
    pr_url: Optional[str] = None
    message: Optional[str] = None
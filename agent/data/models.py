from typing import Optional
from pydantic import BaseModel


class TicketRequest(BaseModel):
    title: str
    description: Optional[str] = None


class PRResponse(BaseModel):
    status: str
    pr_url: Optional[str] = None
    message: Optional[str] = None
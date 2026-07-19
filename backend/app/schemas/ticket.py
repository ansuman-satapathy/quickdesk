from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field
from app.models.ticket import TicketStatus, TicketPriority, TicketCategory
from app.schemas.user import UserResponse

class TicketCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Title of the ticket")
    description: str = Field(..., min_length=1, description="Detailed description of the ticket")
    attachment: Optional[str] = Field(None, description="Optional attachment path or URL")

class TicketResponse(BaseModel):
    id: UUID
    title: str
    description: str
    attachment: Optional[str]
    status: TicketStatus
    ai_category: Optional[TicketCategory]
    ai_priority: Optional[TicketPriority]
    category: Optional[TicketCategory]
    priority: Optional[TicketPriority]
    ai_draft: Optional[str]
    final_reply: Optional[str]
    created_by: UUID
    creator: Optional[UserResponse] = None
    resolved_by: Optional[UUID]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    category: Optional[TicketCategory] = None

class TicketReply(BaseModel):
    reply: str = Field(..., min_length=1, description="Final reply resolution text")


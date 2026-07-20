import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.schemas.user import UserResponse

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    agent_id: uuid.UUID
    agent: Optional[UserResponse] = None
    field: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime

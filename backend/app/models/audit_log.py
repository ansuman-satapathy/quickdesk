import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.user import User

class AuditLog(SQLModel, table=True):
    __tablename__: str = "audit_logs"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    ticket_id: uuid.UUID = Field(
        foreign_key="tickets.id",
        nullable=False
    )
    agent_id: uuid.UUID = Field(
        foreign_key="users.id",
        nullable=False
    )
    field: str = Field(nullable=False)
    old_value: Optional[str] = Field(default=None, nullable=True)
    new_value: Optional[str] = Field(default=None, nullable=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False
    )

    # Relationships
    ticket: "Ticket" = Relationship(back_populates="audit_logs")
    agent: "User" = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "AuditLog.agent_id == User.id"
        }
    )

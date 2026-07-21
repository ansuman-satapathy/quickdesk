from enum import Enum
import uuid
from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import JSON
from sqlmodel import SQLModel, Field, Relationship, AutoString

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.audit_log import AuditLog

class TicketStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"

class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class TicketCategory(str, Enum):
    IT = "it"
    HR = "hr"
    FINANCE = "finance"
    ADMIN = "admin"
    OTHER = "other"

class Ticket(SQLModel, table=True):
    __tablename__: str = "tickets"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    title: str = Field(nullable=False)
    description: str = Field(nullable=False)
    attachment: Optional[str] = Field(default=None, nullable=True)
    status: TicketStatus = Field(
        default=TicketStatus.OPEN,
        sa_type=AutoString,
        nullable=False
    )
    
    # AI suggested fields
    ai_category: Optional[TicketCategory] = Field(
        default=None,
        sa_type=AutoString,
        nullable=True
    )
    ai_priority: Optional[TicketPriority] = Field(
        default=None,
        sa_type=AutoString,
        nullable=True
    )
    
    # User/Agent override fields
    category: Optional[TicketCategory] = Field(
        default=None,
        sa_type=AutoString,
        nullable=True
    )
    priority: Optional[TicketPriority] = Field(
        default=None,
        sa_type=AutoString,
        nullable=True
    )
    
    # Replies
    ai_draft: Optional[str] = Field(default=None, nullable=True)
    ai_citations: Optional[List[str]] = Field(
        default=None,
        nullable=True,
        sa_type=JSON
    )
    final_reply: Optional[str] = Field(default=None, nullable=True)
    
    # User linkages
    created_by: uuid.UUID = Field(
        foreign_key="users.id",
        nullable=False
    )
    resolved_by: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="users.id",
        nullable=True
    )
    
    resolved_at: Optional[datetime] = Field(default=None, nullable=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False
    )

    # Relationships
    creator: "User" = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "Ticket.created_by == User.id",
            "back_populates": "tickets_created"
        }
    )
    resolver: Optional["User"] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "Ticket.resolved_by == User.id",
            "back_populates": "tickets_resolved"
        }
    )
    
    audit_logs: List["AuditLog"] = Relationship(
        back_populates="ticket",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )



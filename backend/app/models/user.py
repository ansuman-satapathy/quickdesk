from enum import Enum
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, AutoString

class UserRole(str, Enum):
    EMPLOYEE = "employee"
    AGENT = "agent"
    SUPERADMIN = "superadmin"

class User(SQLModel, table=True):
    __tablename__: str = "users"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    email: str = Field(unique=True, index=True, nullable=False)
    password_hash: str = Field(nullable=False)
    full_name: str = Field(nullable=False)
    role: UserRole = Field(default=UserRole.EMPLOYEE, sa_type=AutoString, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False
    )




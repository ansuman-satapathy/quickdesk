import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

# SQLModel combines SQLAlchemy models and Pydantic schemas into one class.
# table=True tells SQLModel that this class maps directly to a database table.
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
    role: str = Field(default="employee", nullable=False) # 'employee' or 'agent'
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )

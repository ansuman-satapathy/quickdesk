from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlmodel import SQLModel
from app.core.config import settings

# Create async engine for PostgreSQL connection
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
)

# Async session maker
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# SQLModel uses a shared metadata registry.
# Base metadata comes from SQLModel.metadata.

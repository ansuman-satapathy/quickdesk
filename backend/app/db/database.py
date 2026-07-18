from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from app.core.config import settings

# Create async engine for PostgreSQL connection
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
)

# Async session maker utilizing SQLModel's AsyncSession
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# SQLModel uses a shared metadata registry.
# Base metadata comes from SQLModel.metadata.


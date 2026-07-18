from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from uuid import UUID

from app.db.database import SessionLocal
from app.models.user import User
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for yielding async database sessions to API routes."""
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency to retrieve and validate the currently logged-in user via JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode token claims
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
            
        user_id = UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    # Query database for user
    statement = select(User).where(User.id == user_id)
    result = await db.exec(statement)
    user = result.first()

    if user is None:
        raise credentials_exception

    return user

class RoleChecker:
    """Dependency class to enforce role-based access controls on endpoints."""
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return current_user

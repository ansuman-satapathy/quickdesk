from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models.user import User
from app.schemas.user import UserLogin
from app.core.security import verify_password, create_access_token

class AuthService:
    @staticmethod
    async def authenticate_user(db: AsyncSession, login_data: UserLogin) -> User:
        """Authenticate a user by checking email and verifying their password hash."""
        statement = select(User).where(User.email == login_data.email)
        result = await db.exec(statement)
        user = result.first()

        if not user or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user

    @staticmethod
    def generate_user_token(user: User) -> str:
        """Generate a signed JWT token for the authenticated user."""
        return create_access_token(subject=user.id, role=user.role)

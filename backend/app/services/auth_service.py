from typing import List
from uuid import UUID
from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserCreateAdmin, UserUpdateAdmin
from app.core.security import verify_password, create_access_token, get_password_hash

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

    @classmethod
    async def register_user(cls, db: AsyncSession, register_data: UserRegister) -> User:
        """Register a new user with default 'employee' role."""
        statement = select(User).where(User.email == register_data.email)
        result = await db.exec(statement)
        existing_user = result.first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        password_hash = get_password_hash(register_data.password)

        new_user = User(
            email=register_data.email,
            password_hash=password_hash,
            full_name=register_data.full_name,
            role="employee"
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @classmethod
    async def login_user(cls, db: AsyncSession, login_data: UserLogin) -> dict:
        """Log in an existing user and return access token."""
        user = await cls.authenticate_user(db, login_data)
        access_token = cls.generate_user_token(user)
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    @staticmethod
    async def list_users(db: AsyncSession) -> List[User]:
        """List all registered users."""
        statement = select(User).order_by(User.created_at.desc())
        result = await db.exec(statement)
        return result.all()

    @staticmethod
    async def update_user_admin(db: AsyncSession, user_id: UUID, user_update: UserUpdateAdmin) -> User:
        """Update a user's details including role, name, email, and password (Superadmin)."""
        statement = select(User).where(User.id == user_id)
        result = await db.exec(statement)
        user = result.first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if user_update.email is not None:
            email_statement = select(User).where(User.email == user_update.email, User.id != user_id)
            email_result = await db.exec(email_statement)
            existing_email_user = email_result.first()
            if existing_email_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already in use by another user"
                )
            user.email = user_update.email

        if user_update.full_name is not None:
            user.full_name = user_update.full_name

        if user_update.role is not None:
            user.role = user_update.role

        if user_update.password is not None:
            if len(user_update.password) < 6:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password must be at least 6 characters"
                )
            user.password_hash = get_password_hash(user_update.password)

        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def create_user_admin(db: AsyncSession, user_in: UserCreateAdmin) -> User:
        """Create a new user with custom role (Superadmin)."""
        statement = select(User).where(User.email == user_in.email)
        result = await db.exec(statement)
        existing_user = result.first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        password_hash = get_password_hash(user_in.password)

        new_user = User(
            email=user_in.email,
            password_hash=password_hash,
            full_name=user_in.full_name,
            role=user_in.role
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

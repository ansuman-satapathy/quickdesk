from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.api.deps import get_db, get_current_user, RoleChecker
from app.schemas.user import UserRegister, UserResponse, UserLogin, Token, UserUpdateRole, UserCreateAdmin, UserUpdateAdmin
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    register_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user. Always defaults to 'employee' role for public signups."""
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


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Log in an existing user and generate a JWT access token."""
    user = await AuthService.authenticate_user(db, login_data)

    access_token = AuthService.generate_user_token(user)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    return current_user


@router.get("/agent-only", response_model=UserResponse)
async def test_agent_route(current_user: User = Depends(RoleChecker(["agent"]))):
    """A test endpoint accessible only to users with the 'agent' role."""
    return current_user


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(RoleChecker(["superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """List all registered users (Superadmin only)."""
    statement = select(User).order_by(User.created_at.desc())
    result = await db.exec(statement)
    users = result.all()
    return users


@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: UUID,
    role_update: UserUpdateRole,
    current_user: User = Depends(RoleChecker(["superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Update a user's role (Superadmin only)."""
    statement = select(User).where(User.id == user_id)
    result = await db.exec(statement)
    user = result.first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    user.role = role_update.role
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user_admin(
    user_id: UUID,
    user_update: UserUpdateAdmin,
    current_user: User = Depends(RoleChecker(["superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Update a user's details including role, name, email, and password (Superadmin only)."""
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

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user_admin(
    user_in: UserCreateAdmin,
    current_user: User = Depends(RoleChecker(["superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user with custom role (Superadmin only)."""
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


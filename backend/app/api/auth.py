from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_db, get_current_user, RoleChecker
from app.schemas.user import UserRegister, UserResponse, UserLogin, Token, UserCreateAdmin, UserUpdateAdmin
from app.models.user import User
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    register_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user. Always defaults to 'employee' role for public signups."""
    return await AuthService.register_user(db, register_data)

@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Log in an existing user and generate a JWT access token."""
    return await AuthService.login_user(db, login_data)

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
    return await AuthService.list_users(db)

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user_admin(
    user_id: UUID,
    user_update: UserUpdateAdmin,
    current_user: User = Depends(RoleChecker(["superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Update a user's details including role, name, email, and password (Superadmin only)."""
    return await AuthService.update_user_admin(db, user_id, user_update)

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user_admin(
    user_in: UserCreateAdmin,
    current_user: User = Depends(RoleChecker(["superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user with custom role (Superadmin only)."""
    return await AuthService.create_user_admin(db, user_in)

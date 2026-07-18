from fastapi import APIRouter, Depends, status, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.api.deps import get_db, get_current_user, RoleChecker
from app.schemas.user import UserRegister, UserResponse, UserLogin, Token
from app.models.user import User
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

import asyncio
from sqlmodel import select
from app.db.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.core.security import get_password_hash

async def seed_data():
    print("Seeding database...")
    async with SessionLocal() as session:
        # Define seed users
        seed_users = [
            {
                "email": "employee@quickdesk.com",
                "full_name": "Alice Employee",
                "password": "password123",
                "role": UserRole.EMPLOYEE
            },
            {
                "email": "agent@quickdesk.com",
                "full_name": "Bob Agent",
                "password": "password123",
                "role": UserRole.AGENT
            },
            {
                "email": "admin@quickdesk.com",
                "full_name": "Super Admin",
                "password": "password123",
                "role": UserRole.SUPERADMIN
            }
        ]


        # Add users if they don't already exist
        for user_data in seed_users:
            statement = select(User).where(User.email == user_data["email"])
            result = await session.exec(statement)
            existing_user = result.first()

            if not existing_user:
                hashed_password = get_password_hash(user_data["password"])
                new_user = User(
                    email=user_data["email"],
                    full_name=user_data["full_name"],
                    password_hash=hashed_password,
                    role=user_data["role"]
                )
                session.add(new_user)
                print(f"Created {user_data['role']} user: {user_data['email']}")
            else:
                print(f"User already exists: {user_data['email']}")

        await session.commit()
    print("Database seeding completed.")

async def main():
    try:
        await seed_data()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())

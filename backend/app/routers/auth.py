from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.database import AsyncSessionLocal, get_db
from app.models import User

from app.schemas import (
    DeveloperLoginSchema,
    UserCreate,
    LoginSchema
)

from app.auth import (
    DEV_ALLOWED_USERNAMES,
    get_developer_email,
    hash_password,
    normalize_developer_username,
    verify_password,
    create_access_token
)

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

# REGISTER
@router.post("/register")
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(User).where(
            or_(func.lower(User.username) == data.username.lower(), func.lower(User.email) == data.email.lower())
        )
    )

    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already exists"
        )

    user = User(
        username=data.username,
        email=data.email,
        hashed_pw=hash_password(data.password)
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.username})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "email": user.email,
        },
    }


# LOGIN
@router.post("/login")
async def login(data: LoginSchema):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(
                or_(func.lower(User.username) == data.username.lower(), func.lower(User.email) == data.username.lower())
            )
        )

        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid username or email"
            )

        if not verify_password(
            data.password,
            user.hashed_pw
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid password"
            )

        token = create_access_token(
            {"sub": user.username}
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "username": user.username,
                "email": user.email,
            },
        }


@router.post("/developer-login")
async def developer_login(data: DeveloperLoginSchema):
    username = normalize_developer_username(data.username)
    if username not in DEV_ALLOWED_USERNAMES:
        raise HTTPException(
            status_code=401,
            detail="Developer access is only available for safal or sparsha.",
        )

    token = create_access_token({"sub": username, "role": "developer"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": username,
            "email": get_developer_email(username),
        },
    }

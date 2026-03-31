"""User profile endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.user import User

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    name: str | None
    email: str
    push_enabled: bool
    email_enabled: bool
    expo_push_token: str | None

    model_config = {"from_attributes": True}


class UpdateUserRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None


class UpdateNotificationsRequest(BaseModel):
    push_enabled: bool | None = None
    email_enabled: bool | None = None
    expo_push_token: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/", response_model=UserResponse)
async def get_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/", response_model=UserResponse)
async def update_user(
    body: UpdateUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.name is not None:
        current_user.name = body.name
    if body.email is not None:
        current_user.email = body.email
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/notifications", response_model=UserResponse)
async def update_notifications(
    body: UpdateNotificationsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.push_enabled is not None:
        current_user.push_enabled = body.push_enabled
    if body.email_enabled is not None:
        current_user.email_enabled = body.email_enabled
    if body.expo_push_token is not None:
        current_user.expo_push_token = body.expo_push_token
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    current_user.hashed_password = hash_password(body.new_password)
    await db.commit()

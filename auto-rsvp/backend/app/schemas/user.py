from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None
    interests_description: str  # required: used by the AI matching engine

    @field_validator("interests_description")
    @classmethod
    def interests_min_length(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("interests_description must be at least 10 characters")
        return v.strip()

    @field_validator("first_name", "last_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("must not be blank")
        return v.strip()


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    interests_description: str | None = None

    @field_validator("interests_description")
    @classmethod
    def interests_min_length(cls, v: str | None) -> str | None:
        if v is not None and len(v.strip()) < 10:
            raise ValueError("interests_description must be at least 10 characters")
        return v.strip() if v else v

    @field_validator("first_name", "last_name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("must not be blank")
        return v.strip() if v else v


class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: str | None = None
    interests_description: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    skip: int
    limit: int

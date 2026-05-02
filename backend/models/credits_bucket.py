from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from sqlmodel import Field, SQLModel, Relationship

from models import _uuid, _now
from models.enums import UserRole

if TYPE_CHECKING:
    from models.user import User


class CreditsBucket(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    credits: int = Field(default=3)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    user: Optional["User"] = Relationship(back_populates="credits_bucket")

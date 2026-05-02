from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from sqlmodel import Field, SQLModel, Relationship

from models import _uuid, _now
from models.enums import UserRole

if TYPE_CHECKING:
    from models.job import Job
    from models.thumbnail import Thumbnail
    from models.credits_bucket import CreditsBucket


class User(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    email: str = Field(default="")
    password_hash: str = Field(default="")
    name: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
    role: str = Field(default=UserRole.USER.value)
    jobs: List["Job"] = Relationship(back_populates="user")
    thumbnails: List["Thumbnail"] = Relationship(back_populates="user")
    credits_bucket: Optional["CreditsBucket"] = Relationship(back_populates="user")

from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship

from models import _uuid, _now
from enums import UserRole
from job import Job
from thumbnail import Thumbnail


class User(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    email: str = Field(default="")
    name: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
    role: str = Field(default=UserRole.USER.value)
    jobs: List[Job] = Relationship(back_populates="user")

    thumbnails: List[Thumbnail] = Relationship(back_populates="user")

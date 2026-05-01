from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship

from models import _uuid, _now
from enums import Status
from thumbnail import Thumbnail
from user import User

class Job(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    prompt: str = Field(default="")
    num_thumbnails: int = Field(default=1, ge=1, le=3)
    headshot_url: Optional[str] = Field(default="")
    status: str = Field(default=Status.PENDING.value)
    created_at: datetime = Field(default_factory=_now)

    thumbnails: List[Thumbnail] = Relationship(back_populates="job")
    user: Optional["User"] = Relationship(back_populates="jobs")
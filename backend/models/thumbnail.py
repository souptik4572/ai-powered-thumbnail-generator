from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, SQLModel, Relationship

from models import _uuid, _now
from models.enums import Status

if TYPE_CHECKING:
    from models.user import User
    from models.job import Job

class Thumbnail(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    job_id: str = Field(foreign_key="job.id")
    style_name: str = Field(default="")
    imagekit_url: Optional[str] = Field(default=None)
    imagekit_file_id: Optional[str] = Field(default=None)
    status: str = Field(default=Status.PENDING.value)
    error_message: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=_now)

    job: Optional["Job"] = Relationship(back_populates="thumbnails")
    user: Optional["User"] = Relationship(back_populates="thumbnails")
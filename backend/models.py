from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4
from enum import Enum

from sqlmodel import Field, SQLModel, Relationship


def _uuid() -> str:
    return str(uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Status(Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    GENERATING = "GENERATING"
    UPLOADED = "UPLOADED"
    FAILED = "FAILED"


class Thumbnail(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    job_id: str = Field(foreign_key="job.id")
    style_name: str = Field(default="")
    imagekit_url: Optional[str] = Field(default=None)
    status: str = Field(default=Status.PENDING.value)
    error_message: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=_now)

    job: Optional["Job"] = Relationship(back_populates="thumbnails")


class Job(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    prompt: str = Field(default="")
    num_thumbnails: int = Field(default=1, ge=1, le=3)
    headshot_url: Optional[str] = Field(default="")
    status: str = Field(default=Status.PENDING.value)
    created_at: datetime = Field(default_factory=_now)

    thumbnails: List[Thumbnail] = Relationship(back_populates="job")

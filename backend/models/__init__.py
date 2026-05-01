from uuid import uuid4
from datetime import datetime, timezone
from models.job import Job
from models.thumbnail import Thumbnail
from models.user import User
from models.enums import Status, UserRole


def _uuid() -> str:
    return str(uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)

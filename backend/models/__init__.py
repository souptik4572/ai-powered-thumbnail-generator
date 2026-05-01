from uuid import uuid4
from datetime import datetime, timezone


def _uuid() -> str:
    return str(uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)

from models.enums import Status, UserRole
from models.user import User            
from models.job import Job              
from models.thumbnail import Thumbnail  

User.model_rebuild()
Job.model_rebuild()
Thumbnail.model_rebuild()

__all__ = ["_uuid", "_now", "Status", "UserRole", "User", "Job", "Thumbnail"]

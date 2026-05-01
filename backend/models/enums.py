from enum import Enum


class Status(Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    GENERATING = "GENERATING"
    UPLOADED = "UPLOADED"
    FAILED = "FAILED"


class UserRole(Enum):
    USER = "USER"
    ADMIN = "ADMIN"

from pydantic import BaseModel

from models import Status

# Request - Response Schemas

class CreateJobRequest(BaseModel):
    prompt: str
    num_thumbnails: int
    headshot_url: str


class CreateJobResponse(BaseModel):
    job_id: str


class ThumbnailResponse(BaseModel):
    id: str
    style_name: str
    status: Status
    imagekit_url: str | None = None
    error_message: str | None = None
    variants: dict | None = None


class JobResponse(BaseModel):
    id: str
    prompt: str
    num_thumbnails: int
    headshot_url: str
    status: Status
    thumbnails: list[ThumbnailResponse]

class RegisterUserRequest(BaseModel):
    email: str
    password: str
    name: str
    location: str | None = None
    
class LoginUserRequest(BaseModel):
    email: str
    password: str
    
class UserResponse(BaseModel):
    message: str
    jwt_token: str
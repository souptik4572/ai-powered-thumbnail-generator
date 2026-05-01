from pydantic import BaseModel

from backend.models.enums import Status

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

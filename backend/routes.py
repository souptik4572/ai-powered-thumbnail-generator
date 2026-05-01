import os
import logging
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import Thumbnail, Job, Status

from services.generator import process_job, STYLES_ORDER
from services.imagekit_service import upload_file, get_variants

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

# Request - Response Schemas


class CreateJobRequest(BaseModel):
    prompt: str
    num_thumbnails: int
    headshot_url: str


class CreateJobResponse(BaseModel):
    job_id: int


class ThumbnailResponse(BaseModel):
    id: int
    style_name: str
    status: Status
    imagekit_url: str | None = None
    error_message: str | None = None
    variants: dict | None = None


@router.post("/upload-headshot")
async def upload_headshot(file: UploadFile = File(...)):
    contents = await file.read()
    url = upload_file(
        file_bytes=contents,
        file_name=file.filename or "headshot.png",
        folder="headshots",
        content_type=file.content_type or "image/png"
    )
    return {url: url}


@router.post("/jobs", response_model=CreateJobResponse)
async def create_job(request: CreateJobRequest, session: Session = Depends(get_session)):
    if request.num_thumbnails < 1 or request.num_thumbnails > len(STYLES_ORDER):
        raise HTTPException(
            status_code=400, detail=f"num_thumbnails must be between 1 and {len(STYLES_ORDER)}")
    job = Job(
        prompt=request.prompt,
        num_thumbnails=request.num_thumbnails,
        headshot_url=request.headshot_url,
    )
    session.add(job)
    styles = STYLES_ORDER[:request.num_thumbnails]
    for style in styles:
        thumbnail = Thumbnail(job_id=job.id, style_name=style)
        session.add(thumbnail)
    session.commit()
    # Fire and forget the job processing
    asyncio.create_task(process_job(job.id))

    return CreateJobResponse(job_id=job.id)  # type: ignore

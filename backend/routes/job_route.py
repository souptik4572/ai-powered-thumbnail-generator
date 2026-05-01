import json
import logging
import asyncio
from typing import Optional

from fastapi import Depends, HTTPException, UploadFile, File, APIRouter
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlmodel import Session, select

from database import get_session
from models.thumbnail import Thumbnail
from models.job import Job
from models.enums import Status

from services.generator import process_job, STYLES_ORDER
from services.imagekit_service import upload_file, get_variants
from dtos import CreateJobRequest, CreateJobResponse, JobResponse, ThumbnailResponse
from config import ACCESS_SECRET_TOKEN, JWT_ALGORITHM

router = APIRouter()

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, ACCESS_SECRET_TOKEN, algorithms=[
                             JWT_ALGORITHM])  # type: ignore
        user_id = payload.get("user_id")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=401, detail="Invalid authentication credentials")


@router.post("/upload-headshot")
async def upload_headshot(file: UploadFile = File(...)):
    contents = await file.read()
    url = upload_file(
        file_bytes=contents,
        file_name=file.filename or "headshot.png",
        folder="headshots",
        content_type=file.content_type or "image/png"
    )
    return {"url": url}


@router.post("/jobs", response_model=CreateJobResponse)
async def create_job(request: CreateJobRequest, session: Session = Depends(get_session), user_id: str = Depends(get_current_user)):
    if request.num_thumbnails < 1 or request.num_thumbnails > len(STYLES_ORDER):
        raise HTTPException(
            status_code=400, detail=f"num_thumbnails must be between 1 and {len(STYLES_ORDER)}")
    job = Job(
        prompt=request.prompt,
        num_thumbnails=request.num_thumbnails,
        headshot_url=request.headshot_url,
        user_id=user_id
    )
    session.add(job)
    styles = STYLES_ORDER[:request.num_thumbnails]
    for style in styles:
        thumbnail = Thumbnail(job_id=job.id, user_id=user_id, style_name=style)
        session.add(thumbnail)
    session.commit()
    # Fire and forget the job processing
    asyncio.create_task(process_job(job.id))

    return CreateJobResponse(job_id=job.id)  # type: ignore


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str, session: Session = Depends(get_session)):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=404, detail=f"Job with given id {job_id} not found")
    thumbnails = session.exec(select(Thumbnail).where(
        Thumbnail.job_id == job_id)).all()
    thumbnail_response = []
    for thumbnail in thumbnails:
        variants = get_variants(
            thumbnail.imagekit_url) if thumbnail.imagekit_url else None
        thumbnail_response.append(
            ThumbnailResponse(
                id=thumbnail.id,  # type: ignore
                style_name=thumbnail.style_name,
                status=thumbnail.status,  # type: ignore
                imagekit_url=thumbnail.imagekit_url,
                error_message=thumbnail.error_message,
                variants=variants)
        )
    return JobResponse(
        id=job.id,  # type: ignore
        prompt=job.prompt,
        num_thumbnails=job.num_thumbnails,
        headshot_url=job.headshot_url,  # type: ignore
        status=job.status,  # type: ignore
        thumbnails=thumbnail_response
    )


@router.get("/thumbnails", response_model=list[ThumbnailResponse])
def get_all_thumbnails(
    status: Optional[Status] = None,
    session: Session = Depends(get_session)
):
    query = select(Thumbnail)
    if status:
        query = query.where(Thumbnail.status == status)
    thumbnails = session.exec(query).all()
    result = []
    for thumbnail in thumbnails:
        variants = get_variants(
            thumbnail.imagekit_url) if thumbnail.imagekit_url else None
        result.append(
            ThumbnailResponse(
                id=thumbnail.id,  # type: ignore
                style_name=thumbnail.style_name,
                status=thumbnail.status,  # type: ignore
                imagekit_url=thumbnail.imagekit_url,
                error_message=thumbnail.error_message,
                variants=variants,
            )
        )
    return result


@router.get("/jobs/{job_id}/stream")
async def stream_job(job_id: str):
    async def event_generator():
        from database import engine
        sent_thumbnails = set()

        while True:
            with Session(engine) as session:
                job = session.get(Job, job_id)
                if not job:
                    yield f"event: error\ndata: {json.dumps({"error": f"Job not found with id {job_id}"})}"
                    return
                thumbnails = session.exec(
                    select(Thumbnail).where(Thumbnail.job_id == job_id)
                ).all()
                for thumbnail in thumbnails:
                    if thumbnail.id in sent_thumbnails:
                        continue
                    if thumbnail.status == Status.UPLOADED.value:
                        variants = get_variants(
                            thumbnail.imagekit_url)  # type: ignore
                        data = json.dumps({
                            "thumbnail_id": thumbnail.id,
                            "style_name": thumbnail.style_name,
                            "imagekit_url": thumbnail.imagekit_url,
                            "variants": variants
                        })
                        yield f"event: thumbnail_ready\ndata: {data}\n\n"
                    elif thumbnail.status == Status.FAILED.value:
                        data = json.dumps({
                            "thumbnail_id": thumbnail.id,
                            "style_name": thumbnail.style_name,
                            "error": thumbnail.error_message
                        })
                        yield f"event: thumbnail_failed\ndata: {data}\n\n"
                    sent_thumbnails.add(thumbnail.id)
                all_done = all(thumbnail.status in [
                               Status.UPLOADED.value, Status.FAILED.value] for thumbnail in thumbnails)
                if all_done and len(sent_thumbnails) == len(thumbnails):
                    data = json.dumps({
                        "job_id": job_id,
                        "status": job.status,
                    })
                    yield f"event: job_completed\ndata: {data}"
                    return
                await asyncio.sleep(1.5)

    return StreamingResponse(
        event_generator(),  # type: ignore
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive", "X-Accel-Buffering": "no"
        }
    )

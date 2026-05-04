import json
import logging
import asyncio
from collections import defaultdict
from typing import Optional

from fastapi import Depends, HTTPException, UploadFile, File, APIRouter
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, col

from database import get_session
from models.thumbnail import Thumbnail
from models.job import Job
from models.enums import Status
from models.credits_bucket import CreditsBucket

from services.generator import process_job, STYLES_ORDER
from services.imagekit_service import upload_file, get_variants
from dtos import CreateJobRequest, CreateJobResponse, JobResponse, ThumbnailResponse
from utils import get_current_user
from utils.logging import hash_identifier

router = APIRouter()

logger = logging.getLogger(__name__)


@router.post("/upload-headshot")
async def upload_headshot(file: UploadFile = File(...)):
    file_name_hash = hash_identifier(file.filename)
    logger.info(
        "headshot_upload_started",
        extra={"file_name_hash": file_name_hash, "content_type": file.content_type},
    )
    contents = await file.read()
    url = upload_file(
        file_bytes=contents,
        file_name=file.filename or "headshot.png",
        folder="headshots",
        content_type=file.content_type or "image/png"
    )
    logger.info(
        "headshot_upload_completed",
        extra={"file_name_hash": file_name_hash, "content_length": len(contents)},
    )
    return {"url": url}


@router.post("/jobs", response_model=CreateJobResponse)
async def create_job(request: CreateJobRequest, session: Session = Depends(get_session), user_id: str = Depends(get_current_user)):
    logger.info(
        "job_create_requested",
        extra={
            "user_id": user_id,
            "num_thumbnails": request.num_thumbnails,
            "prompt_length": len(request.prompt),
            "has_headshot": bool(request.headshot_url),
        },
    )
    if request.num_thumbnails < 1 or request.num_thumbnails > len(STYLES_ORDER):
        logger.warning(
            "job_create_rejected_invalid_thumbnail_count",
            extra={"user_id": user_id, "num_thumbnails": request.num_thumbnails},
        )
        raise HTTPException(
            status_code=400, detail=f"num_thumbnails must be between 1 and {len(STYLES_ORDER)}")
    credits_bucket = session.exec(
        select(CreditsBucket).where(CreditsBucket.user_id == user_id)
    ).first()
    if not credits_bucket or not (credits_bucket.credits >= request.num_thumbnails):
        logger.warning(
            "job_create_rejected_insufficient_credits",
            extra={
                "user_id": user_id,
                "requested_thumbnails": request.num_thumbnails,
                "available_credits": credits_bucket.credits if credits_bucket else 0,
            },
        )
        raise HTTPException(status_code=402, detail="Insufficient credits")
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
    logger.info(
        "job_created",
        extra={"job_id": job.id, "user_id": user_id, "thumbnail_count": len(styles)},
    )
    # Fire and forget the job processing
    asyncio.create_task(process_job(job.id))
    logger.info("job_processing_task_scheduled", extra={"job_id": job.id, "user_id": user_id})

    return CreateJobResponse(job_id=job.id)  # type: ignore


@router.get("/jobs", response_model=list[JobResponse])
def get_all_jobs(session: Session = Depends(get_session), user_id: str = Depends(get_current_user)):
    logger.info("jobs_list_requested", extra={"user_id": user_id})
    jobs = session.exec(
        select(Job).where(Job.user_id == user_id).order_by(col(Job.created_at).desc())
    ).all()

    if not jobs:
        logger.info("jobs_list_completed", extra={"user_id": user_id, "job_count": 0})
        return []

    # Single query for all thumbnails — eliminates N+1
    job_ids = [job.id for job in jobs]
    all_thumbnails = session.exec(
        select(Thumbnail).where(col(Thumbnail.job_id).in_(job_ids))
    ).all()

    thumbnails_by_job: dict[str, list] = defaultdict(list)
    for thumbnail in all_thumbnails:
        thumbnails_by_job[thumbnail.job_id].append(thumbnail)

    job_responses = []
    for job in jobs:
        thumbnail_response = [
            ThumbnailResponse(
                id=thumbnail.id,  # type: ignore
                style_name=thumbnail.style_name,
                status=thumbnail.status,  # type: ignore
                imagekit_url=thumbnail.imagekit_url,
                error_message=thumbnail.error_message,
                variants=get_variants(thumbnail.imagekit_url) if thumbnail.imagekit_url else None,
            )
            for thumbnail in thumbnails_by_job.get(job.id, [])
        ]
        job_responses.append(
            JobResponse(
                id=job.id,  # type: ignore
                prompt=job.prompt,
                num_thumbnails=job.num_thumbnails,
                headshot_url=job.headshot_url,
                status=job.status,  # type: ignore
                thumbnails=thumbnail_response,
                created_at=job.created_at,
            )
        )
    logger.info(
        "jobs_list_completed",
        extra={
            "user_id": user_id,
            "job_count": len(job_responses),
            "thumbnail_count": len(all_thumbnails),
        },
    )
    return job_responses


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str, session: Session = Depends(get_session)):
    logger.info("job_get_requested", extra={"job_id": job_id})
    job = session.get(Job, job_id)
    if not job:
        logger.warning("job_get_not_found", extra={"job_id": job_id})
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
    logger.info(
        "job_get_completed",
        extra={"job_id": job_id, "status": job.status, "thumbnail_count": len(thumbnail_response)},
    )
    return JobResponse(
        id=job.id,  # type: ignore
        prompt=job.prompt,
        num_thumbnails=job.num_thumbnails,
        headshot_url=job.headshot_url,  # type: ignore
        status=job.status,  # type: ignore
        thumbnails=thumbnail_response
    )


@router.get("/jobs/{job_id}/stream")
async def stream_job(job_id: str):
    logger.info("job_stream_opened", extra={"job_id": job_id})

    async def event_generator():
        from database import engine
        sent_thumbnails = set()

        while True:
            with Session(engine) as session:
                job = session.get(Job, job_id)
                if not job:
                    logger.warning("job_stream_not_found", extra={"job_id": job_id})
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
                        logger.info(
                            "job_stream_thumbnail_ready_sent",
                            extra={"job_id": job_id, "thumbnail_id": thumbnail.id, "style_name": thumbnail.style_name},
                        )
                        sent_thumbnails.add(thumbnail.id)
                    elif thumbnail.status == Status.FAILED.value:
                        data = json.dumps({
                            "thumbnail_id": thumbnail.id,
                            "style_name": thumbnail.style_name,
                            "error": thumbnail.error_message
                        })
                        yield f"event: thumbnail_failed\ndata: {data}\n\n"
                        logger.info(
                            "job_stream_thumbnail_failed_sent",
                            extra={"job_id": job_id, "thumbnail_id": thumbnail.id, "style_name": thumbnail.style_name},
                        )
                        sent_thumbnails.add(thumbnail.id)
                all_done = all(thumbnail.status in [
                               Status.UPLOADED.value, Status.FAILED.value] for thumbnail in thumbnails)
                if all_done and len(sent_thumbnails) == len(thumbnails):
                    data = json.dumps({
                        "job_id": job_id,
                        "status": job.status,
                    })
                    yield f"event: job_completed\ndata: {data}"
                    logger.info(
                        "job_stream_completed",
                        extra={"job_id": job_id, "status": job.status, "thumbnail_count": len(thumbnails)},
                    )
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

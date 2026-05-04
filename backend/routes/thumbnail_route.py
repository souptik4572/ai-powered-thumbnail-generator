import logging

from fastapi import Depends, APIRouter, HTTPException
from sqlmodel import Session, select

from database import get_session
from models.thumbnail import Thumbnail
from models.job import Job
from models.enums import Status

from services.imagekit_service import get_variants
from dtos import ThumbnailResponse
from utils import get_current_user

router = APIRouter()

logger = logging.getLogger(__name__)


@router.get("/thumbnails", response_model=list[ThumbnailResponse])
def get_all_thumbnails(
    status: Status = Status.UPLOADED,
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user)
):
    thumbnails = session.exec(
        select(Thumbnail).where(
            Thumbnail.user_id == user_id,
            Thumbnail.status == status.value,
        ).order_by(Thumbnail.created_at.desc())  # type: ignore
    ).all()

    result = []
    for thumbnail in thumbnails:
        variants = get_variants(thumbnail.imagekit_url) if thumbnail.imagekit_url else None
        job = session.get(Job, thumbnail.job_id)
        result.append(
            ThumbnailResponse(
                id=thumbnail.id,  # type: ignore
                style_name=thumbnail.style_name,
                status=thumbnail.status,  # type: ignore
                imagekit_url=thumbnail.imagekit_url,
                error_message=thumbnail.error_message,
                variants=variants,
                job_id=thumbnail.job_id,
                prompt=job.prompt if job else None,
                created_at=thumbnail.created_at,
            )
        )
    return result


@router.get("/thumbnails/{thumbnail_id}", response_model=ThumbnailResponse)
def get_thumbnail(
    thumbnail_id: str,
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user)
):
    thumbnail = session.get(Thumbnail, thumbnail_id)
    if not thumbnail:
        raise HTTPException(status_code=404, detail=f"Thumbnail {thumbnail_id} not found")
    if thumbnail.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    variants = get_variants(thumbnail.imagekit_url) if thumbnail.imagekit_url else None
    job = session.get(Job, thumbnail.job_id)
    return ThumbnailResponse(
        id=thumbnail.id,  # type: ignore
        style_name=thumbnail.style_name,
        status=thumbnail.status,  # type: ignore
        imagekit_url=thumbnail.imagekit_url,
        error_message=thumbnail.error_message,
        variants=variants,
        job_id=thumbnail.job_id,
        prompt=job.prompt if job else None,
        created_at=thumbnail.created_at,
    )

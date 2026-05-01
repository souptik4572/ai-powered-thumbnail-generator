import logging
from typing import Optional

from fastapi import Depends, APIRouter
from sqlmodel import Session, select

from database import get_session
from models.thumbnail import Thumbnail
from models.enums import Status

from services.imagekit_service import get_variants
from dtos import ThumbnailResponse

router = APIRouter()

logger = logging.getLogger(__name__)


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

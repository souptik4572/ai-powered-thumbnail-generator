import asyncio
import logging

from sqlmodel import Session, select
from database import engine
from models import Thumbnail, Job, CreditsBucket
from services.openai_service import generate_thumbnail
from services.imagekit_service import upload_file, get_variants
from models import Status

logger = logging.getLogger(__name__)

STYLES = {
    "bold_dramatic": (
        "Create a high-contrast cinematic YouTube thumbnail with a dark, moody background and dramatic lighting. "
        "Use strong shadows, rim lighting, and depth to emphasize the main subject. "
        "Ensure a clear focal point and an intense, attention-grabbing mood. "
        "Design the layout for a 16:9 thumbnail with the subject prominently placed and space reserved for bold text. "
        "Keep important elements within a centered safe area to avoid cropping."
    ),

    "clean_minimal": (
        "Create a clean and minimal YouTube thumbnail with bright, even lighting and a light or white background. "
        "Use a modern, professional aesthetic with balanced spacing and strong visual hierarchy. "
        "Maintain simplicity with a clear focal subject and minimal distractions. "
        "Design for a 16:9 layout with structured composition and clear space for short, readable text. "
        "Ensure all key elements remain within a safe central area."
    ),

    "vibrant_energetic": (
        "Create a vibrant and energetic YouTube thumbnail using bold colors, gradients, and dynamic composition. "
        "Incorporate high contrast, motion-inspired angles, and eye-catching visual elements. "
        "Ensure the thumbnail feels lively, engaging, and optimized for high click-through rate. "
        "Design the layout for 16:9 with a strong focal subject and space for bold, short text. "
        "Keep critical elements within a centered safe crop region."
    )
}

STYLES_ORDER = ["bold_dramatic", "clean_minimal", "vibrant_energetic"]


async def generate_single_thumbnail(thumbnail_id: str, prompt: str, headshot_url: str):
    logger.info("thumbnail_generation_started", extra={"thumbnail_id": thumbnail_id})
    # Mark in DB as "generating"
    with Session(engine) as session:
        thumbnail = session.get(Thumbnail, thumbnail_id)
        if not thumbnail:
            logger.error("thumbnail_generation_missing_thumbnail", extra={"thumbnail_id": thumbnail_id})
            return
        thumbnail.status = Status.GENERATING.value  # type: ignore
        style_name = thumbnail.style_name  # type: ignore
        session.add(thumbnail)
        session.commit()
    logger.info(
        "thumbnail_status_updated",
        extra={"thumbnail_id": thumbnail_id, "status": Status.GENERATING.value, "style_name": style_name},
    )
    # Make an API call to AI
    try:
        style_prompt = STYLES[style_name]
        image_bytes = await generate_thumbnail(prompt, style_prompt, headshot_url)
        with Session(engine) as session:
            thumbnail = session.get(Thumbnail, thumbnail_id)
            if not thumbnail:
                logger.error("thumbnail_generation_missing_thumbnail_after_openai", extra={"thumbnail_id": thumbnail_id})
                return
            job_id = thumbnail.job_id  # type: ignore
        # Upload the generated image to ImageKit
        image_url, image_file_id = upload_file(
            file_bytes=image_bytes,
            file_name=f"{thumbnail_id}.png",
            folder=f"thumbnails/{job_id}"
        )
        # Update the DB with the image URL and mark as "completed"
        with Session(engine) as session:
            thumbnail = session.get(Thumbnail, thumbnail_id)
            thumbnail.imagekit_url = image_url  # type: ignore
            thumbnail.imagekit_file_id = image_file_id  # type: ignore
            thumbnail.status = Status.UPLOADED.value  # type: ignore
            session.add(thumbnail)
            session.commit()
        logger.info(
            "thumbnail_generation_completed",
            extra={"thumbnail_id": thumbnail_id, "job_id": job_id, "style_name": style_name},
        )
    except Exception as exception:
        logger.exception(
            "thumbnail_generation_failed",
            extra={"thumbnail_id": thumbnail_id, "style_name": style_name},
        )
        with Session(engine) as session:
            thumbnail = session.get(Thumbnail, thumbnail_id)
            if not thumbnail:
                logger.error("thumbnail_generation_failure_missing_thumbnail", extra={"thumbnail_id": thumbnail_id})
                return
            thumbnail.status = Status.FAILED.value  # type: ignore
            thumbnail.error_message = str(exception)[:500]  # type: ignore
            session.add(thumbnail)
            session.commit()
        logger.info(
            "thumbnail_status_updated",
            extra={"thumbnail_id": thumbnail_id, "status": Status.FAILED.value, "style_name": style_name},
        )


async def process_job(job_id: str):
    logger.info("job_processing_started", extra={"job_id": job_id})
    # Mark the job as "processing"
    # Find all thumbnails for the job
    # Start one worker for each thumbnail (upto 3)
    # Wait for all the worker to finish processing
    # Mark the job as "completed" or "failed"
    with Session(engine) as session:
        job = session.get(Job, job_id)
        if not job:
            logger.error("job_processing_missing_job", extra={"job_id": job_id})
            return
        job.status = Status.PROCESSING.value  # type: ignore
        prompt = job.prompt  # type: ignore
        headshot_url = job.headshot_url  # type: ignore
        session.add(job)
        session.commit()
        logger.info(
            "job_status_updated",
            extra={"job_id": job_id, "user_id": job.user_id, "status": Status.PROCESSING.value},
        )
        thumbnails = session.exec(
            select(Thumbnail).where(Thumbnail.job_id == job_id)
        ).all()
        thumbnails_ids = [thumbnail.id for thumbnail in thumbnails]
        logger.info(
            "job_thumbnails_loaded",
            extra={"job_id": job_id, "thumbnail_count": len(thumbnails_ids)},
        )

        tasks = [
            generate_single_thumbnail(
                thumbnail_id, prompt, headshot_url)   # type: ignore
            for thumbnail_id in thumbnails_ids
        ]

        await asyncio.gather(*tasks, return_exceptions=True)
        logger.info("job_thumbnail_tasks_completed", extra={"job_id": job_id})

        thumbnails = session.exec(
            select(Thumbnail).where(Thumbnail.job_id == job_id)
        ).all()
        all_failed = all(thumbnail.status ==
                         Status.FAILED.value for thumbnail in thumbnails)
        job = session.get(Job, job_id)
        if not job:
            logger.error("job_processing_missing_job_before_completion", extra={"job_id": job_id})
            return
        job.status = Status.FAILED.value if all_failed else Status.UPLOADED.value  # type: ignore
        session.add(job)
        if not all_failed:
            credits_bucket = session.exec(
                select(CreditsBucket).where(CreditsBucket.user_id == job.user_id)  # type: ignore
            ).first()
            if credits_bucket and credits_bucket.credits > 0:
                credits_bucket.credits -= 1
                session.add(credits_bucket)
                logger.info(
                    "credits_decremented",
                    extra={"job_id": job_id, "user_id": job.user_id, "remaining_credits": credits_bucket.credits},
                )
            else:
                logger.warning(
                    "credits_decrement_skipped",
                    extra={"job_id": job_id, "user_id": job.user_id, "credits_bucket_found": bool(credits_bucket)},
                )
        session.commit()
        logger.info(
            "job_processing_completed",
            extra={
                "job_id": job_id,
                "user_id": job.user_id,
                "status": job.status,
                "thumbnail_count": len(thumbnails),
                "failed_thumbnail_count": sum(
                    1 for thumbnail in thumbnails if thumbnail.status == Status.FAILED.value
                ),
            },
        )

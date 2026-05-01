import asyncio
import logging

from sqlmodel import Session, select
from database import engine
from models import Thumbnail, Job
from services.openai_service import generate_thumbnail
from services.imagekit_service import upload_file, get_variants
from models import Status

logger = logging.getLogger(__name__)

STYLES = {
    "bold_dramatic": (
        "Create a bold Youtube thumbnail with high contrast, cinematic lighting, dark moody background and powerful composition. ",
        "The person's face should be prominent with a dramatic expression."
    ),
    "clean_minimal": (
        "Create a clean and minimal Youtube thumbnail with bright lighting, white / light background, mordern professional aesthetic, ",
        "plenty of whitespace, and sharp clean composition. ",
        "The person should look approachable and professional."
    ),
    "ibrant_energetic": (
        "Create a vibrant and energetic Youtube thumbnail with colorful gradients, ",
        "dynamic angles, eye-catching pop art style colors and energetic compostion. ",
        "The person should have an exciting and engaging expression."
    )
}

STYLES_ORDER = ["bold_dramatic", "clean_minimal", "ibrant_energetic"]


async def generate_single_thumbnail(thumbnail_id: str, prompt: str, headshot_url: str):
    # Mark in DB as "generating"
    with Session(engine) as session:
        thumbnail = session.get(Thumbnail, thumbnail_id)
        thumbnail.status = Status.GENERATING.value  # type: ignore
        style_name = thumbnail.style_name  # type: ignore
        session.add(thumbnail)
        session.commit()
    style_pompt = STYLES[style_name]
    # Make an API call to AI
    try:
        image_bytes = await generate_thumbnail(prompt, style_pompt, headshot_url)
        with Session(engine) as session:
            thumbnail = session.get(Thumbnail, thumbnail_id)
            job_id = thumbnail.job_id  # type: ignore
        # Uploade the generated image to ImageKit
        image_url = upload_file(
            file_bytes=image_bytes,
            file_name=f"{thumbnail_id}.png",
            folder=f"thumbnails/{job_id}"
        )
        # Update the DB with the image URL and mark as "completed"
        with Session(engine) as session:
            thumbnail = session.get(Thumbnail, thumbnail_id)
            thumbnail.imagekit_url = image_url  # type: ignore
            thumbnail.status = Status.UPLOADED.value  # type: ignore
            session.add(thumbnail)
            session.commit()
    except Exception as exception:
        logger.error(f"Error generating thumbnail {thumbnail_id}: {exception}")
        with Session(engine) as session:
            thumbnail = session.get(Thumbnail, thumbnail_id)
            thumbnail.status = Status.FAILED.value  # type: ignore
            thumbnail.error_message = str(exception)[:500]  # type: ignore
            session.add(thumbnail)
            session.commit()


async def process_job(job_id: str):
    # Mark the job as "processing"
    # Find all thumbnails for the job
    # Start one worker for each thumbnail (upto 3)
    # Wait for all the worker to finish processing
    # Mark the job as "completed" or "failed"
    with Session(engine) as session:
        job = session.get(Job, job_id)
        job.status = Status.PROCESSING.value  # type: ignore
        prompt = job.prompt  # type: ignore
        headshot_url = job.headshot_url  # type: ignore
        session.add(job)
        session.commit()
        thumbnails = session.exec(
            select(Thumbnail).where(Thumbnail.job_id == job_id)
        ).all()
        thumbnails_ids = [thumbnail.id for thumbnail in thumbnails]

        tasks = [
            generate_single_thumbnail(
                thumbnail_id, prompt, headshot_url)   # type: ignore
            for thumbnail_id in thumbnails_ids
        ]

        await asyncio.gather(*tasks, return_exceptions=True)

        thumbnails = session.exec(
            select(Thumbnail).where(Thumbnail.job_id == job_id)
        ).all()
        all_failed = all(thumbnail.status ==
                         Status.FAILED.value for thumbnail in thumbnails)
        session.get(Job, job_id)
        job.status = Status.FAILED.value if all_failed else Status.COMPLETED.value  # type: ignore
        session.add(job)
        session.commit()

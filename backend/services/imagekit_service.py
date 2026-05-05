import logging

from imagekitio import ImageKit
from config import IMAGEKIT_PRIVATE_KEY
from utils.logging import hash_identifier

imagekit = ImageKit(private_key=IMAGEKIT_PRIVATE_KEY)
logger = logging.getLogger(__name__)


def upload_file(file_bytes: bytes, file_name: str, folder: str, content_type: str = "image/jpeg") -> tuple[str, str]:
    """Uploads an image to ImageKit and returns (cdn_url, file_id)."""
    file_name_hash = hash_identifier(file_name)
    logger.info(
        "imagekit_upload_started",
        extra={
            "file_name_hash": file_name_hash,
            "folder": folder,
            "content_type": content_type,
            "content_length": len(file_bytes),
        },
    )
    response = imagekit.files.upload(
        file=(file_name, file_bytes, content_type),
        file_name=file_name,
        folder=folder,
        is_private_file=False,
        use_unique_file_name=True
    )
    if not response.url or not response.file_id:
        logger.error("imagekit_upload_missing_url", extra={"file_name_hash": file_name_hash, "folder": folder})
        raise ValueError("ImageKit upload succeeded but no URL or file_id was returned")
    logger.info("imagekit_upload_completed", extra={"file_name_hash": file_name_hash, "folder": folder})
    return response.url, response.file_id


def delete_file(file_id: str) -> None:
    """Deletes a file from ImageKit by its file ID."""
    file_id_hash = hash_identifier(file_id)
    logger.info("imagekit_delete_started", extra={"file_id_hash": file_id_hash})
    imagekit.files.delete(file_id)
    logger.info("imagekit_delete_completed", extra={"file_id_hash": file_id_hash})


def get_variants(base_url: str) -> dict:
    """Returns 3 sizes variant URLs using imagekit transformations."""
    return {
        "youtube": f"{base_url}?tr=w-1280,h-720,c-maintain_ratio,fo-auto",
        "shorts": f"{base_url}?tr=w-1080,h-1920,c-maintain_ratio,fo-auto",
        "square": f"{base_url}?tr=w-1080,h-1080,c-maintain_ratio,fo-auto"
    }

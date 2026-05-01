from imagekitio import ImageKit
from config import IMAGEKIT_PRIVATE_KEY

imagekit = ImageKit(private_key=IMAGEKIT_PRIVATE_KEY)


def upload_file(file_bytes: bytes, file_name: str, folder: str, content_type: str = "image/jpeg") -> str:
    """Uploads an image to ImageKit and returns the CDN URL of the uploaded image."""
    response = imagekit.files.upload(
        file=(file_name, file_bytes, content_type),
        file_name=file_name,
        folder=folder,
        is_private_file=False,
        use_unique_file_name=True
    )
    if not response.url:
        raise ValueError("ImageKit upload succeeded but no URL was returned")
    return response.url


def get_variants(base_url: str) -> dict:
    """Returns 3 sizes variant URLs using imagekit transformations."""
    return {
        "youtube": f"{base_url}?tr=w-1280,h-720,c-maintain_ratio,fo-auto",
        "shorts": f"{base_url}?tr=w-1080,h-1920,c-maintain_ratio,fo-auto",
        "square": f"{base_url}?tr=w-1080,h-1080,c-maintain_ratio,fo-auto"
    }

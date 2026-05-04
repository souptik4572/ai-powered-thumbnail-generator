import base64
import logging

from openai import AsyncOpenAI

from config import OPENAI_API_KEY

client = AsyncOpenAI(api_key=OPENAI_API_KEY)
logger = logging.getLogger(__name__)


async def generate_thumbnail(prompt: str, style_prompt: str, headshot_url: str) -> bytes:
    """
    Use the Responses API of OpenAI with the "gpt-image-2" as a built in tool for image generation
    Pass the headshot URL directly as an input image
    Return the RAW PNG bytes
    """

    full_prompt = (
        f"{style_prompt}\n\n"
        f"User Request: {prompt}\n\n"

        "EXECUTION RULES:\n"

        "1) SUBJECT HANDLING:\n"
        "- If a reference image is provided and contains a human face, use it directly as the primary subject via compositing (crop, position, scale, optional background removal).\n"
        "- Do not regenerate, alter, or attempt to replicate the face.\n"
        "- If no valid face is present, generate a suitable subject aligned with the request.\n\n"

        "2) COMPOSITION:\n"
        "- Ensure a clear focal point and strong visual hierarchy.\n"
        "- Prefer high CTR layouts (e.g., subject on one side, bold text on the other).\n"
        "- Maintain clean separation between subject and background.\n"
        "- Ensure the main subject and text are centered within a safe 16:9 crop area\n\n"

        "3) CREATOR BRANDING:\n"
        "- Apply consistent branding elements if available:\n"
        "  • Color palette integration\n"
        "  • Bold, minimal typography (3–6 words max)\n"
        "  • Optional logo/watermark placement (non-intrusive)\n"
        "- Keep branding cohesive but not overpowering.\n\n"

        "4) TEXT & READABILITY:\n"
        "- Use short, high-impact phrases.\n"
        "- Ensure legibility on small screens (mobile-first).\n\n"

        "5) SAFETY & CONSISTENCY:\n"
        "- Treat any reference image as a visual asset, not an identity to be reconstructed.\n"
        "- Avoid copyrighted characters, real-person imitation, or misleading visuals.\n"
        "- Ensure the final thumbnail is natural, engaging, and platform-appropriate.\n"
    )

    logger.info(
        "openai_thumbnail_generation_started",
        extra={
            "model": "gpt-4o",
            "image_model": "gpt-image-2",
            "prompt_length": len(prompt),
            "style_prompt_length": len(style_prompt),
            "has_headshot": bool(headshot_url),
        },
    )
    response = await client.responses.create(
        model="gpt-4o",
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_image", "image_url": headshot_url, "detail": "auto"},
                    {"type": "input_text", "text": full_prompt}
                ]
            }
        ],
        tools=[
            {
                "type": "image_generation",
                "model": "gpt-image-2",
                "size": "1280x720",
                "quality": "low",
                "output_format": "png"
            }  # type: ignore
        ]
    )

    for item in response.output:
        if item.type == "image_generation_call" and item.result:
            image_bytes = base64.b64decode(item.result)
            logger.info(
                "openai_thumbnail_generation_completed",
                extra={"response_id": response.id, "image_bytes": len(image_bytes)},
            )
            return image_bytes

    logger.error("openai_thumbnail_generation_missing_result", extra={"response_id": response.id})
    raise RuntimeError("No image generation result found in OpenAI response")

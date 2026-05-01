from openai import AsyncOpenAI
import base64
from config import OPENAI_API_KEY

client = AsyncOpenAI(api_key=OPENAI_API_KEY)


async def generate_thumbnail(prompt: str, style_prompt: str, headshot_url: str) -> bytes:
    """
    Use the Responses API of OpenAI with the "gpt-image-2" as a built in tool for image generation
    Pass the headshot URL directly as an input image
    Return the RAW PNG bytes
    """

    full_prompt = (
        f"{style_prompt}\n\n"
        f"User Request: {prompt}\n\n"
        f"IMPORTANT: The generated thumbnail MUST prominently feature the person "
        f"as shown in the provided reference headshot image. Keep their entire likeness accurate"
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
                "size": "1024x1024",
                "quality": "low",
                "output_format": "png"
            }  # type: ignore
        ]
    )

    for item in response.output:
        if item.type == "image_generation_call" and item.result:
            return base64.b64decode(item.result)

    raise RuntimeError("No image generation result found in OpenAI response")

import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", None)
IMAGEKIT_PRIVATE_KEY = os.getenv("IMAGEKIT_PRIVATE_KEY", None)
IMAGEKIT_PUBLIC_KEY = os.getenv("IMAGEKIT_PUBLIC_KEY", None)
IMAGEKIT_URL_ENDPOINT = os.getenv("IMAGEKIT_URL_ENDPOINT", None)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./thumbnailbuilder.db")

ACCESS_SECRET_TOKEN = os.getenv("ACCESS_SECRET_TOKEN", None)
BCRYPT_SALT = int(os.getenv("BCRYPT_SALT", 5))
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", None)

MAX_USERS = int(os.getenv("MAX_USERS", 5))

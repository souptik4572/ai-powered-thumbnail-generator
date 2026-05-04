import logging

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt

from config import ACCESS_SECRET_TOKEN, JWT_ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
logger = logging.getLogger(__name__)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, ACCESS_SECRET_TOKEN, algorithms=[
                             JWT_ALGORITHM])  # type: ignore
        user_id = payload.get("user_id")
        logger.debug("auth_token_decoded", extra={"user_id": user_id})
        return user_id
    except jwt.PyJWTError:
        logger.warning("auth_token_invalid")
        raise HTTPException(
            status_code=401, detail="Invalid authentication credentials")

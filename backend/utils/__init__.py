from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import jwt

from config import ACCESS_SECRET_TOKEN, JWT_ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, ACCESS_SECRET_TOKEN, algorithms=[
                             JWT_ALGORITHM])  # type: ignore
        user_id = payload.get("user_id")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=401, detail="Invalid authentication credentials")

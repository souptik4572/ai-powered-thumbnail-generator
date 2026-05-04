import logging

from sqlmodel import Session, select, func
from fastapi import APIRouter, Depends, HTTPException
import bcrypt
import jwt

from models.credits_bucket import CreditsBucket
from database import get_session
from models.user import User
from dtos import RegisterUserRequest, LoginUserRequest, UserResponse, CreditsResponse
from config import BCRYPT_SALT, ACCESS_SECRET_TOKEN, JWT_ALGORITHM, MAX_USERS
from utils import get_current_user
from utils.logging import hash_identifier

router = APIRouter()
logger = logging.getLogger(__name__)


def hash_item(item, is_password=True):
    item = item.encode('utf-8') if is_password else item
    return str(bcrypt.hashpw(
        item, bcrypt.gensalt(BCRYPT_SALT))).replace("b'", "").replace("'", "")


def check_password(given_password, actual_password):
    return bcrypt.checkpw(given_password.encode('utf-8'), actual_password.encode('utf-8'))


def generate_jwt_token(user_id):
    return jwt.encode({"user_id": user_id}, ACCESS_SECRET_TOKEN, algorithm=JWT_ALGORITHM)


@router.post("/users/register")
def register_user(request: RegisterUserRequest, session: Session = Depends(get_session)):
    email_hash = hash_identifier(request.email)
    logger.info("user_register_requested", extra={"email_hash": email_hash, "has_location": bool(request.location)})
    # Count the number of users in the database
    user_count = session.exec((select(func.count()).select_from(User))).one()
    if user_count >= MAX_USERS:
        logger.warning(
            "user_register_rejected_user_limit",
            extra={"email_hash": email_hash, "user_count": user_count, "max_users": MAX_USERS},
        )
        raise HTTPException(
            status_code=400, detail="User limit reached. We are working on trying to increase the limit. Please try again later.")
    # Check if user with the same email already exists
    existing_user = session.exec(select(User).where(
        User.email == request.email)).first()
    if existing_user:
        logger.warning("user_register_rejected_duplicate_email", extra={"email_hash": email_hash})
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    new_user = User(
        email=request.email,
        # Implement password hashing
        password_hash=hash_item(request.password),
        name=request.name,
        location=request.location
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    credits_bucket = CreditsBucket(user_id=new_user.id)
    new_user.credits_bucket = credits_bucket
    session.add(credits_bucket)
    session.commit()
    session.refresh(new_user)

    jwt_token = generate_jwt_token(new_user.id)
    logger.info("user_registered", extra={"user_id": new_user.id, "email_hash": email_hash})

    return UserResponse(
        message="User registered successfully",
        jwt_token=jwt_token
    )


@router.get("/users/credits", response_model=CreditsResponse)
def get_user_credits(session: Session = Depends(get_session), user_id: str = Depends(get_current_user)):
    logger.info("credits_get_requested", extra={"user_id": user_id})
    credits_bucket = session.exec(
        select(CreditsBucket).where(CreditsBucket.user_id == user_id)
    ).first()
    if not credits_bucket:
        logger.warning("credits_get_not_found", extra={"user_id": user_id})
        raise HTTPException(status_code=404, detail="Credits bucket not found")
    logger.info("credits_get_completed", extra={"user_id": user_id, "credits": credits_bucket.credits})
    return CreditsResponse(credits=credits_bucket.credits)


@router.post("/users/login")
def login_user(request: LoginUserRequest, session: Session = Depends(get_session)):
    email_hash = hash_identifier(request.email)
    logger.info("user_login_requested", extra={"email_hash": email_hash})
    user = session.exec(select(User).where(
        User.email == request.email)).first()
    if not user:
        logger.warning("user_login_rejected_user_not_found", extra={"email_hash": email_hash})
        raise HTTPException(status_code=404, detail="User not found")

    # Verify password
    if not check_password(request.password, user.password_hash):
        logger.warning("user_login_rejected_invalid_credentials", extra={"user_id": user.id, "email_hash": email_hash})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    jwt_token = generate_jwt_token(user.id)
    logger.info("user_login_completed", extra={"user_id": user.id, "email_hash": email_hash})

    return UserResponse(
        message="Login successful",
        jwt_token=jwt_token
    )

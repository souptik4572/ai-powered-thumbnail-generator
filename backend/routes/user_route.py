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

router = APIRouter()


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
    # Count the number of users in the database
    user_count = session.exec((select(func.count()).select_from(User))).one()
    if user_count >= MAX_USERS:
        raise HTTPException(
            status_code=400, detail="User limit reached. We are working on trying to increase the limit. Please try again later.")
    # Check if user with the same email already exists
    existing_user = session.exec(select(User).where(
        User.email == request.email)).first()
    if existing_user:
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

    return UserResponse(
        message="User registered successfully",
        jwt_token=jwt_token
    )


@router.get("/users/credits", response_model=CreditsResponse)
def get_user_credits(session: Session = Depends(get_session), user_id: str = Depends(get_current_user)):
    credits_bucket = session.exec(
        select(CreditsBucket).where(CreditsBucket.user_id == user_id)
    ).first()
    if not credits_bucket:
        raise HTTPException(status_code=404, detail="Credits bucket not found")
    return CreditsResponse(credits=credits_bucket.credits)


@router.post("/users/login")
def login_user(request: LoginUserRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(
        User.email == request.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify password
    if not check_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    jwt_token = generate_jwt_token(user.id)

    return UserResponse(
        message="Login successful",
        jwt_token=jwt_token
    )

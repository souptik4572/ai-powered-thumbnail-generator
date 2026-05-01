from sqlmodel import Session, select
from fastapi import Depends, HTTPException
import bcrypt
import jwt

from database import get_session
from models.user import User
from routes import router
from dtos import RegisterUserRequest, LoginUserRequest, UserResponse
from config import BCRYPT_SALT, ACCESS_SECRET_TOKEN, JWT_ALGORITHM


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

    jwt_token = generate_jwt_token(new_user.id)

    return UserResponse(
        message="User registered successfully",
        jwt_token=jwt_token
    )


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

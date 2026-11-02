from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db import query_one
from app.security import USER_FIELDS, create_token, create_user, current_user

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL = r"^\S+@\S+\.\S+$"


class Signup(BaseModel):
    full_name: str = Field(min_length=1)
    email: str = Field(pattern=EMAIL)
    password: str = Field(min_length=8)
    role: Literal["STUDENT", "FACULTY"] = "STUDENT"


class Login(BaseModel):
    email: str
    password: str


def session(user):
    return {"token": create_token(user["user_id"]), "user": user}


@router.post("/signup", status_code=201)
def signup(body: Signup):
    return session(create_user(body.full_name, body.email, body.password, body.role))


@router.post("/login")
def login(body: Login):
    user = query_one(
        f"SELECT {USER_FIELDS} FROM users WHERE email = lower(%s) AND password_hash = crypt(%s, password_hash)",
        [body.email, body.password],
    )
    if not user:
        raise HTTPException(401, "Wrong email or password")
    return session(user)


@router.get("/me")
def me(user=Depends(current_user)):
    return user

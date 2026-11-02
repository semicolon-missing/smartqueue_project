import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db import query_one

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-secret")
USER_FIELDS = "user_id, full_name, email, user_role"

bearer = HTTPBearer()


def create_user(full_name, email, password, role):
    return query_one(
        f"""
        INSERT INTO users (full_name, email, password_hash, user_role)
        VALUES (%s, lower(%s), crypt(%s, gen_salt('bf')), %s)
        RETURNING {USER_FIELDS}
        """,
        [full_name, email, password, role],
    )


def create_token(user_id):
    expires = datetime.now(timezone.utc) + timedelta(hours=12)
    return jwt.encode({"sub": str(user_id), "exp": expires}, SECRET_KEY, algorithm="HS256")


def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        user_id = int(jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])["sub"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Please log in again")

    user = query_one(f"SELECT {USER_FIELDS} FROM users WHERE user_id = %s", [user_id])
    if not user:
        raise HTTPException(401, "Please log in again")
    return user


def role(*allowed):
    def check(user=Depends(current_user)):
        if user["user_role"] not in allowed:
            raise HTTPException(403, "Not allowed")
        return user
    return check


customer = role("STUDENT", "FACULTY")
staff = role("STAFF", "ADMIN")
admin = role("ADMIN")

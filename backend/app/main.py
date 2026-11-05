import os
from contextlib import asynccontextmanager

import psycopg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db import pool
from app.routes import admin, auth, kitchen, menu, orders


@asynccontextmanager
async def lifespan(app):
    pool.open()
    yield
    pool.close()


app = FastAPI(title="CampusBite", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (auth, menu, orders, kitchen, admin):
    app.include_router(module.router)


@app.exception_handler(psycopg.errors.RaiseException)
async def rule_broken(request, exc):
    return JSONResponse({"detail": exc.diag.message_primary}, status_code=400)


@app.exception_handler(psycopg.errors.UniqueViolation)
async def already_exists(request, exc):
    return JSONResponse({"detail": "Already exists"}, status_code=409)


@app.exception_handler(psycopg.errors.CheckViolation)
async def invalid_value(request, exc):
    return JSONResponse({"detail": "Invalid value"}, status_code=400)

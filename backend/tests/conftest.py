import json
import os
import pathlib
from datetime import datetime, timedelta, timezone

import psycopg
import pytest
from fastapi.testclient import TestClient

ADMIN_URL = os.environ.get("DATABASE_URL", "postgresql://smartqueue:smartqueue@localhost:5433/smartqueue")
TEST_DB = "smartqueue_test"
TEST_URL = psycopg.conninfo.make_conninfo(ADMIN_URL, dbname=TEST_DB)
SQL_DIR = pathlib.Path(__file__).parents[2] / "sql"

os.environ["DATABASE_URL"] = TEST_URL


@pytest.fixture(scope="session")
def test_url():
    with psycopg.connect(ADMIN_URL, autocommit=True) as conn:
        conn.execute(f"DROP DATABASE IF EXISTS {TEST_DB} WITH (FORCE)")
        conn.execute(f"CREATE DATABASE {TEST_DB}")

    with psycopg.connect(TEST_URL, autocommit=True) as conn:
        for path in sorted(SQL_DIR.glob("*.sql")):
            conn.execute(path.read_text())
    return TEST_URL


@pytest.fixture(scope="session")
def client(test_url):
    from app.main import app
    with TestClient(app) as client:
        yield client


def login(client, email):
    response = client.post("/auth/login", json={"email": email, "password": "password123"})
    return {"Authorization": f"Bearer {response.json()['token']}"}


@pytest.fixture
def db(test_url):
    with psycopg.connect(test_url) as conn:
        yield conn
        conn.rollback()


def user_id(db, email="aarav@smartqueue.local"):
    return db.execute("SELECT user_id FROM users WHERE email = %s", [email]).fetchone()[0]


def item(db, name):
    return db.execute(
        "SELECT item_id, price, stock_quantity FROM menu_items WHERE item_name = %s", [name]
    ).fetchone()


def place_order(db, items, customer_id, minutes_until_pickup=20):
    pickup = datetime.now(timezone.utc) + timedelta(minutes=minutes_until_pickup)
    return db.execute(
        "SELECT place_order(%s, %s, %s)", [customer_id, pickup, json.dumps(items)]
    ).fetchone()[0]

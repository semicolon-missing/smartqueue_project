from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from app.db import copy_csv, query, query_one
from app.routes.auth import EMAIL
from app.routes.menu import update_item
from app.security import USER_FIELDS, admin, create_user

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(admin)])

TODAY = """
    SELECT
        COUNT(*) FILTER (WHERE order_status <> 'CANCELLED') AS orders,
        COUNT(*) FILTER (WHERE order_status = 'CANCELLED') AS cancelled,
        COALESCE(SUM(total_amount) FILTER (WHERE order_status <> 'CANCELLED'), 0) AS revenue,
        round(AVG(EXTRACT(EPOCH FROM ready_at - ordered_at) / 60), 1) AS avg_wait_minutes
    FROM order_summary
    WHERE ordered_at >= date_trunc('day', now())
"""

LAST_7_DAYS = """
    SELECT ordered_at::date AS day, COUNT(*) AS orders, SUM(total_amount) AS revenue
    FROM order_summary
    WHERE order_status <> 'CANCELLED' AND ordered_at >= date_trunc('day', now()) - interval '6 days'
    GROUP BY day
    ORDER BY day
"""


class NewItem(BaseModel):
    item_name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    price: Decimal = Field(ge=0)
    base_prep_time_minutes: int = Field(gt=0)
    stock_quantity: int = Field(ge=0)
    low_stock_threshold: int = Field(5, ge=0)
    is_available: bool = True


class ItemChange(BaseModel):
    item_name: str | None = Field(None, min_length=1)
    category: str | None = Field(None, min_length=1)
    price: Decimal | None = Field(None, ge=0)
    base_prep_time_minutes: int | None = Field(None, gt=0)
    stock_quantity: int | None = Field(None, ge=0)
    low_stock_threshold: int | None = Field(None, ge=0)
    is_available: bool | None = None


class NewStaff(BaseModel):
    full_name: str = Field(min_length=1)
    email: str = Field(pattern=EMAIL)
    password: str = Field(min_length=8)
    role: Literal["STAFF", "ADMIN"] = "STAFF"


class Stations(BaseModel):
    parallel_stations: int = Field(gt=0, le=20)


@router.post("/items", status_code=201)
def add_item(body: NewItem):
    item = query_one(
        """
        INSERT INTO menu_items
            (item_name, category, price, base_prep_time_minutes, stock_quantity, low_stock_threshold, is_available)
        VALUES
            (%(item_name)s, %(category)s, %(price)s, %(base_prep_time_minutes)s,
             %(stock_quantity)s, %(low_stock_threshold)s, %(is_available)s)
        RETURNING item_id
        """,
        body.model_dump(),
    )
    return query_one("SELECT * FROM menu_board WHERE item_id = %s", [item["item_id"]])


@router.patch("/items/{item_id}")
def change_item(item_id: int, body: ItemChange):
    return update_item(item_id, body.model_dump(exclude_none=True))


@router.get("/staff")
def list_staff():
    return query(
        f"SELECT {USER_FIELDS}, created_at FROM users WHERE user_role IN ('STAFF', 'ADMIN') ORDER BY user_role, full_name"
    )


@router.post("/staff", status_code=201)
def add_staff(body: NewStaff):
    return create_user(body.full_name, body.email, body.password, body.role)


@router.delete("/staff/{user_id}", status_code=204)
def remove_staff(user_id: int, me=Depends(admin)):
    if user_id == me["user_id"]:
        raise HTTPException(400, "You cannot remove yourself")
    removed = query_one(
        "DELETE FROM users WHERE user_id = %s AND user_role IN ('STAFF', 'ADMIN') RETURNING user_id", [user_id]
    )
    if not removed:
        raise HTTPException(404, "Staff member not found")


@router.put("/stations")
def set_stations(body: Stations):
    return query_one(
        "UPDATE kitchen_config SET parallel_stations = %s RETURNING parallel_stations", [body.parallel_stations]
    )


@router.get("/reports")
def reports():
    return {
        "today": query_one(TODAY),
        "last_7_days": query(LAST_7_DAYS),
        "break_demand": query("SELECT * FROM break_demand ORDER BY pickup_hour"),
        "item_sales": query("SELECT * FROM item_sales ORDER BY units_sold DESC"),
        "low_stock": query("SELECT * FROM menu_board WHERE is_low_stock ORDER BY stock_quantity"),
        "kitchen": query_one("SELECT parallel_stations FROM kitchen_config"),
    }


@router.get("/reports/latency.csv")
def latency_csv():
    return Response(
        copy_csv("SELECT * FROM order_latency ORDER BY ordered_at"),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=queue_latency_audit.csv"},
    )

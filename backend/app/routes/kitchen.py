from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db import query, query_one
from app.routes.menu import update_item
from app.security import staff

router = APIRouter(prefix="/kitchen", tags=["kitchen"], dependencies=[Depends(staff)])


class StatusChange(BaseModel):
    status: Literal["PREPARING", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"]


class Pickup(BaseModel):
    pickup_code: str


class StockChange(BaseModel):
    stock_quantity: int | None = Field(None, ge=0)
    is_available: bool | None = None


def summary(order_id):
    return query_one("SELECT * FROM order_summary WHERE order_id = %s", [order_id])


@router.get("/board")
def board():
    return {
        "queue": query("SELECT * FROM kitchen_board ORDER BY queue_position"),
        "ready": query("SELECT * FROM order_summary WHERE order_status = 'READY_FOR_PICKUP' ORDER BY ready_at"),
        "low_stock": query(
            "SELECT item_id, item_name, stock_quantity FROM menu_board WHERE is_low_stock ORDER BY stock_quantity"
        ),
    }


@router.post("/orders/{order_id}/status")
def change_status(order_id: int, body: StatusChange):
    updated = query_one(
        "UPDATE orders SET order_status = %s WHERE order_id = %s RETURNING order_id", [body.status, order_id]
    )
    if not updated:
        raise HTTPException(404, "Order not found")
    return summary(order_id)


@router.post("/pickup")
def pickup(body: Pickup):
    order = query_one(
        """
        UPDATE orders SET order_status = 'COMPLETED'
        WHERE pickup_code = upper(%s) AND order_status = 'READY_FOR_PICKUP'
        RETURNING order_id
        """,
        [body.pickup_code.strip()],
    )
    if not order:
        raise HTTPException(404, "No ready order with this code")
    return summary(order["order_id"])


@router.patch("/items/{item_id}")
def change_stock(item_id: int, body: StockChange):
    return update_item(item_id, body.model_dump(exclude_none=True))

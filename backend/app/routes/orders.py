from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from app.db import query, query_one
from app.security import customer

router = APIRouter(prefix="/orders", tags=["orders"])

ORDER_WITH_QUEUE = """
    SELECT s.*, b.queue_position, b.estimated_ready_at, b.delay_minutes
    FROM order_summary s
    LEFT JOIN kitchen_board b USING (order_id)
"""


class Line(BaseModel):
    item_id: int
    quantity: int = Field(gt=0, le=20)


class NewOrder(BaseModel):
    pickup_time: datetime
    items: list[Line] = Field(min_length=1)


def find_order(order_id, user):
    order = query_one(ORDER_WITH_QUEUE + "WHERE order_id = %s AND s.user_id = %s", [order_id, user["user_id"]])
    if not order:
        raise HTTPException(404, "Order not found")

    order["lines"] = query(
        """
        SELECT m.item_name, oi.quantity, oi.item_price_at_order
        FROM order_items oi
        JOIN menu_items m USING (item_id)
        WHERE oi.order_id = %s
        ORDER BY m.item_name
        """,
        [order_id],
    )
    return order


@router.post("", status_code=201)
def place(body: NewOrder, user=Depends(customer)):
    items = Jsonb([line.model_dump() for line in body.items])
    order_id = query_one(
        "SELECT place_order(%s, %s, %s) AS order_id", [user["user_id"], body.pickup_time, items]
    )["order_id"]
    return find_order(order_id, user)


@router.get("")
def history(user=Depends(customer)):
    return query(ORDER_WITH_QUEUE + "WHERE s.user_id = %s ORDER BY s.ordered_at DESC", [user["user_id"]])


@router.get("/{order_id}")
def detail(order_id: int, user=Depends(customer)):
    return find_order(order_id, user)


@router.post("/{order_id}/cancel")
def cancel(order_id: int, user=Depends(customer)):
    find_order(order_id, user)
    query_one("UPDATE orders SET order_status = 'CANCELLED' WHERE order_id = %s RETURNING order_id", [order_id])
    return find_order(order_id, user)

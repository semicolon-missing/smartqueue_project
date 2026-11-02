from fastapi import APIRouter, HTTPException
from psycopg import sql

from app.db import query, query_one

router = APIRouter(tags=["menu"])

KITCHEN_LOAD = """
    SELECT
        COUNT(*) AS queue_length,
        COALESCE(GREATEST(ceil(EXTRACT(EPOCH FROM MAX(estimated_ready_at) - now()) / 60), 0), 0)::INT
            AS estimated_wait_minutes
    FROM kitchen_board
"""


@router.get("/menu")
def menu():
    items = query("SELECT * FROM menu_board ORDER BY is_orderable DESC, base_prep_time_minutes, stock_quantity DESC")
    return {"items": items, **query_one(KITCHEN_LOAD)}


def update_item(item_id, fields):
    if not fields:
        raise HTTPException(400, "Nothing to update")

    assignments = sql.SQL(", ").join(
        sql.SQL("{} = {}").format(sql.Identifier(name), sql.Placeholder(name)) for name in fields
    )
    updated = query_one(
        sql.SQL("UPDATE menu_items SET {} WHERE item_id = %(item_id)s RETURNING item_id").format(assignments),
        {**fields, "item_id": item_id},
    )
    if not updated:
        raise HTTPException(404, "Item not found")
    return query_one("SELECT * FROM menu_board WHERE item_id = %s", [item_id])

from concurrent.futures import ThreadPoolExecutor

import psycopg
import pytest

from conftest import item, place_order, user_id


def test_all_tables_exist(db):
    tables = {row[0] for row in db.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    )}
    assert {"users", "menu_items", "orders", "order_items", "kitchen_queue"} <= tables


def test_order_deducts_stock_and_freezes_price(db):
    samosa_id, price, stock = item(db, "Samosa (Aloo/Matar)")
    order_id = place_order(db, [{"item_id": samosa_id, "quantity": 3}], user_id(db))

    assert item(db, "Samosa (Aloo/Matar)")[2] == stock - 3
    frozen = db.execute("SELECT item_price_at_order FROM order_items WHERE order_id = %s", [order_id]).fetchone()[0]
    assert frozen == price


def test_oversell_aborts_whole_order(db):
    chai_id, _, chai_stock = item(db, "Masala Adraki Chai")
    wrap_id, _, wrap_stock = item(db, "Paneer Paratha")
    orders_before = db.execute("SELECT COUNT(*) FROM orders").fetchone()[0]

    with pytest.raises(psycopg.errors.RaiseException, match="Insufficient stock"):
        with db.transaction():
            place_order(db, [
                {"item_id": chai_id, "quantity": 1},
                {"item_id": wrap_id, "quantity": wrap_stock + 1},
            ], user_id(db))

    assert item(db, "Masala Adraki Chai")[2] == chai_stock
    assert db.execute("SELECT COUNT(*) FROM orders").fetchone()[0] == orders_before


def test_unavailable_item_is_rejected(db):
    omelette_id = item(db, "Kadhi Chawal")[0]
    with pytest.raises(psycopg.errors.RaiseException):
        with db.transaction():
            place_order(db, [{"item_id": omelette_id, "quantity": 1}], user_id(db))


def test_empty_order_is_rejected(db):
    with pytest.raises(psycopg.errors.RaiseException, match="at least one item"):
        with db.transaction():
            place_order(db, [], user_id(db))


def test_new_order_enters_kitchen_queue(db):
    order_id = place_order(db, [{"item_id": item(db, "French Fries")[0], "quantity": 1}], user_id(db))
    assert db.execute("SELECT 1 FROM kitchen_queue WHERE order_id = %s", [order_id]).fetchone()


def test_status_flow_stamps_times_and_leaves_queue_when_ready(db):
    order_id = place_order(db, [{"item_id": item(db, "French Fries")[0], "quantity": 1}], user_id(db))

    for status in ["PREPARING", "READY_FOR_PICKUP", "COMPLETED"]:
        db.execute("UPDATE orders SET order_status = %s WHERE order_id = %s", [status, order_id])

    row = db.execute(
        "SELECT preparing_at, ready_at, completed_at FROM orders WHERE order_id = %s", [order_id]
    ).fetchone()
    assert all(row)
    assert not db.execute("SELECT 1 FROM kitchen_queue WHERE order_id = %s", [order_id]).fetchone()


def test_invalid_status_change_is_rejected(db):
    order_id = place_order(db, [{"item_id": item(db, "French Fries")[0], "quantity": 1}], user_id(db))
    with pytest.raises(psycopg.errors.RaiseException, match="Invalid status change"):
        with db.transaction():
            db.execute("UPDATE orders SET order_status = 'COMPLETED' WHERE order_id = %s", [order_id])


def test_cancel_restores_stock(db):
    thali_id, _, stock = item(db, "Amritsari Kulcha Thali")
    order_id = place_order(db, [{"item_id": thali_id, "quantity": 2}], user_id(db))
    db.execute("UPDATE orders SET order_status = 'CANCELLED' WHERE order_id = %s", [order_id])

    assert item(db, "Amritsari Kulcha Thali")[2] == stock
    assert not db.execute("SELECT 1 FROM kitchen_queue WHERE order_id = %s", [order_id]).fetchone()


def test_cannot_cancel_once_preparing(db):
    order_id = place_order(db, [{"item_id": item(db, "French Fries")[0], "quantity": 1}], user_id(db))
    db.execute("UPDATE orders SET order_status = 'PREPARING' WHERE order_id = %s", [order_id])
    with pytest.raises(psycopg.errors.RaiseException):
        with db.transaction():
            db.execute("UPDATE orders SET order_status = 'CANCELLED' WHERE order_id = %s", [order_id])


def test_menu_board_tiers(db):
    tiers = dict(db.execute("SELECT item_name, turnaround_tier FROM menu_board").fetchall())
    assert tiers["Bisleri Water Bottle"] == "GRAB_AND_GO"
    assert tiers["French Fries"] == "QUICK_COOK"
    assert tiers["Amritsari Kulcha Thali"] == "STANDARD_PREP"


def test_kitchen_board_orders_by_pickup_time(db):
    customer = user_id(db)
    maggi_id = item(db, "French Fries")[0]
    later = place_order(db, [{"item_id": maggi_id, "quantity": 1}], customer, minutes_until_pickup=40)
    sooner = place_order(db, [{"item_id": maggi_id, "quantity": 1}], customer, minutes_until_pickup=10)

    positions = dict(db.execute("SELECT order_id, queue_position FROM kitchen_board").fetchall())
    assert positions[sooner] < positions[later]


def test_concurrent_orders_never_oversell(test_url):
    with psycopg.connect(test_url, autocommit=True) as conn:
        rush_id = conn.execute(
            "INSERT INTO menu_items (item_name, category, price, base_prep_time_minutes, stock_quantity) "
            "VALUES ('Rush Item', 'Test', 10, 2, 25) RETURNING item_id"
        ).fetchone()[0]
        customer = user_id(conn)

    def try_order(_):
        try:
            with psycopg.connect(test_url) as conn:
                place_order(conn, [{"item_id": rush_id, "quantity": 1}], customer)
            return True
        except psycopg.errors.RaiseException:
            return False

    with ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(try_order, range(100)))

    with psycopg.connect(test_url) as conn:
        stock = conn.execute("SELECT stock_quantity FROM menu_items WHERE item_id = %s", [rush_id]).fetchone()[0]

    assert results.count(True) == 25
    assert stock == 0

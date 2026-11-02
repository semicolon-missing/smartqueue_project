from datetime import datetime, timedelta, timezone

from conftest import login

STUDENT = "diya@smartqueue.local"
STAFF = "ravi.staff@smartqueue.local"
ADMIN = "admin@smartqueue.local"


def menu_item(client, name):
    return next(i for i in client.get("/menu").json()["items"] if i["item_name"] == name)


def order(client, headers, lines, minutes_until_pickup=20):
    pickup = (datetime.now(timezone.utc) + timedelta(minutes=minutes_until_pickup)).isoformat()
    return client.post("/orders", headers=headers, json={"pickup_time": pickup, "items": lines})


def test_signup_login_and_me(client):
    created = client.post("/auth/signup", json={
        "full_name": "New Student", "email": "New@Campus.edu", "password": "secret123",
    })
    assert created.status_code == 201

    headers = {"Authorization": f"Bearer {created.json()['token']}"}
    assert client.get("/auth/me", headers=headers).json()["email"] == "new@campus.edu"
    assert client.post("/auth/signup", json={
        "full_name": "Again", "email": "new@campus.edu", "password": "secret123",
    }).status_code == 409


def test_wrong_password_is_rejected(client):
    response = client.post("/auth/login", json={"email": STUDENT, "password": "nope"})
    assert response.status_code == 401


def test_roles_are_enforced(client):
    assert client.get("/kitchen/board", headers=login(client, STUDENT)).status_code == 403
    assert client.get("/admin/reports", headers=login(client, STAFF)).status_code == 403
    assert client.post("/orders", headers=login(client, STAFF), json={}).status_code in (403, 422)
    assert client.get("/admin/reports", headers=login(client, ADMIN)).status_code == 200


def test_menu_shows_tiers_and_kitchen_load(client):
    menu = client.get("/menu").json()
    assert {"queue_length", "estimated_wait_minutes"} <= menu.keys()
    assert menu_item(client, "Bisleri Water Bottle")["turnaround_tier"] == "GRAB_AND_GO"
    assert menu_item(client, "Amul Ice Cream")["is_orderable"] is False


def test_full_order_journey(client):
    student, kitchen = login(client, STUDENT), login(client, STAFF)
    maggi = menu_item(client, "French Fries")

    placed = order(client, student, [{"item_id": maggi["item_id"], "quantity": 2}])
    assert placed.status_code == 201
    placed = placed.json()
    assert placed["order_status"] == "QUEUED"
    assert placed["queue_position"] >= 1
    assert float(placed["total_amount"]) == 2 * float(maggi["price"])

    queue_ids = [o["order_id"] for o in client.get("/kitchen/board", headers=kitchen).json()["queue"]]
    assert placed["order_id"] in queue_ids

    for status in ["PREPARING", "READY_FOR_PICKUP"]:
        response = client.post(f"/kitchen/orders/{placed['order_id']}/status", headers=kitchen, json={"status": status})
        assert response.json()["order_status"] == status

    ready_ids = [o["order_id"] for o in client.get("/kitchen/board", headers=kitchen).json()["ready"]]
    assert placed["order_id"] in ready_ids

    picked = client.post("/kitchen/pickup", headers=kitchen, json={"pickup_code": placed["pickup_code"].lower()})
    assert picked.json()["order_status"] == "COMPLETED"
    assert client.get(f"/orders/{placed['order_id']}", headers=student).json()["order_status"] == "COMPLETED"


def test_oversell_returns_clear_error(client):
    wrap = menu_item(client, "Paneer Paratha")
    response = order(client, login(client, STUDENT), [{"item_id": wrap["item_id"], "quantity": wrap["stock_quantity"] + 1}])
    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]


def test_cancel_restores_stock_only_while_queued(client):
    student, kitchen = login(client, STUDENT), login(client, STAFF)
    thali = menu_item(client, "Amritsari Kulcha Thali")

    first = order(client, student, [{"item_id": thali["item_id"], "quantity": 1}]).json()
    assert client.post(f"/orders/{first['order_id']}/cancel", headers=student).json()["order_status"] == "CANCELLED"
    assert menu_item(client, "Amritsari Kulcha Thali")["stock_quantity"] == thali["stock_quantity"]

    second = order(client, student, [{"item_id": thali["item_id"], "quantity": 1}]).json()
    client.post(f"/kitchen/orders/{second['order_id']}/status", headers=kitchen, json={"status": "PREPARING"})
    assert client.post(f"/orders/{second['order_id']}/cancel", headers=student).status_code == 400


def test_students_only_see_their_own_orders(client):
    mine = order(client, login(client, STUDENT), [{"item_id": menu_item(client, "Samosa (Aloo/Matar)")["item_id"], "quantity": 1}]).json()
    other = login(client, "kabir@smartqueue.local")
    assert client.get(f"/orders/{mine['order_id']}", headers=other).status_code == 404
    assert mine["order_id"] not in [o["order_id"] for o in client.get("/orders", headers=other).json()]


def test_pickup_with_unknown_code(client):
    response = client.post("/kitchen/pickup", headers=login(client, STAFF), json={"pickup_code": "ZZZZZZ"})
    assert response.status_code == 404


def test_staff_can_mark_item_sold_out(client):
    chai = menu_item(client, "Cold Coffee")
    response = client.patch(f"/kitchen/items/{chai['item_id']}", headers=login(client, STAFF), json={"is_available": False})
    assert response.json()["is_orderable"] is False


def test_admin_manages_menu(client):
    headers = login(client, ADMIN)
    created = client.post("/admin/items", headers=headers, json={
        "item_name": "Lemon Soda", "category": "Beverages", "price": 25,
        "base_prep_time_minutes": 2, "stock_quantity": 50,
    })
    assert created.status_code == 201

    updated = client.patch(f"/admin/items/{created.json()['item_id']}", headers=headers, json={"price": 30})
    assert float(updated.json()["price"]) == 30


def test_admin_manages_staff(client):
    headers = login(client, ADMIN)
    created = client.post("/admin/staff", headers=headers, json={
        "full_name": "New Cook", "email": "cook@smartqueue.local", "password": "kitchen123",
    }).json()
    assert created["user_role"] == "STAFF"

    me = client.get("/auth/me", headers=headers).json()
    assert client.delete(f"/admin/staff/{me['user_id']}", headers=headers).status_code == 400
    assert client.delete(f"/admin/staff/{created['user_id']}", headers=headers).status_code == 204


def test_admin_reports_and_csv(client):
    headers = login(client, ADMIN)
    reports = client.get("/admin/reports", headers=headers).json()
    assert reports["break_demand"]
    assert reports["item_sales"]

    csv = client.get("/admin/reports/latency.csv", headers=headers)
    assert csv.headers["content-type"].startswith("text/csv")
    assert csv.text.splitlines()[0].startswith("order_id,")

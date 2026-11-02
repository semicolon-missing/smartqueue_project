
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'STUDENT'
        CHECK (user_role IN ('STUDENT', 'FACULTY', 'STAFF', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE menu_items (
    item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    price NUMERIC(8, 2) NOT NULL CHECK (price >= 0),
    base_prep_time_minutes INT NOT NULL CHECK (base_prep_time_minutes > 0),
    stock_quantity INT NOT NULL CHECK (stock_quantity >= 0),
    low_stock_threshold INT NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE orders (
    order_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users ON DELETE CASCADE,
    pickup_code TEXT NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
    order_status TEXT NOT NULL DEFAULT 'QUEUED'
        CHECK (order_status IN ('QUEUED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED')),
    ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    target_pickup_time TIMESTAMPTZ NOT NULL,
    preparing_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    CHECK (target_pickup_time > ordered_at)
);

CREATE TABLE order_items (
    order_id INT NOT NULL REFERENCES orders ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES menu_items,
    quantity INT NOT NULL CHECK (quantity > 0),
    item_price_at_order NUMERIC(8, 2) NOT NULL CHECK (item_price_at_order >= 0),
    PRIMARY KEY (order_id, item_id)
);

CREATE TABLE kitchen_queue (
    order_id INT PRIMARY KEY REFERENCES orders ON DELETE CASCADE,
    enqueued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kitchen_config (
    config_id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (config_id),
    parallel_stations INT NOT NULL DEFAULT 3 CHECK (parallel_stations > 0)
);

INSERT INTO kitchen_config DEFAULT VALUES;

CREATE UNIQUE INDEX active_pickup_code ON orders (pickup_code)
    WHERE order_status IN ('QUEUED', 'PREPARING', 'READY_FOR_PICKUP');
CREATE INDEX orders_by_user ON orders (user_id, ordered_at DESC);
CREATE INDEX orders_by_status ON orders (order_status);
CREATE INDEX order_items_by_item ON order_items (item_id);

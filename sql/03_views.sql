CREATE VIEW menu_board AS
SELECT
    item_id,
    item_name,
    category,
    price,
    base_prep_time_minutes,
    stock_quantity,
    low_stock_threshold,
    is_available,
    is_available AND stock_quantity > 0 AS is_orderable,
    stock_quantity <= low_stock_threshold AS is_low_stock,
    CASE
        WHEN base_prep_time_minutes <= 3 THEN 'GRAB_AND_GO'
        WHEN base_prep_time_minutes <= 7 THEN 'QUICK_COOK'
        ELSE 'STANDARD_PREP'
    END AS turnaround_tier
FROM menu_items;


CREATE VIEW order_summary AS
SELECT
    o.order_id,
    o.user_id,
    u.full_name,
    o.pickup_code,
    o.order_status,
    o.ordered_at,
    o.target_pickup_time,
    o.preparing_at,
    o.ready_at,
    o.completed_at,
    o.cancelled_at,
    SUM(oi.quantity * oi.item_price_at_order) AS total_amount,
    MAX(m.base_prep_time_minutes) AS prep_minutes,
    string_agg(oi.quantity || ' x ' || m.item_name, ', ' ORDER BY m.item_name) AS items
FROM orders o
JOIN users u USING (user_id)
JOIN order_items oi USING (order_id)
JOIN menu_items m USING (item_id)
GROUP BY o.order_id, u.full_name;


CREATE VIEW kitchen_board AS
WITH remaining AS (
    SELECT
        s.*,
        q.enqueued_at,
        GREATEST(s.prep_minutes - COALESCE(EXTRACT(EPOCH FROM now() - s.preparing_at) / 60, 0), 0)
            AS remaining_minutes
    FROM kitchen_queue q
    JOIN order_summary s USING (order_id)
),
ranked AS (
    SELECT
        r.*,
        ROW_NUMBER() OVER w AS queue_position,
        SUM(r.remaining_minutes) OVER w AS work_ahead_minutes
    FROM remaining r
    WINDOW w AS (
        ORDER BY r.order_status = 'QUEUED', r.target_pickup_time, r.enqueued_at, r.order_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )
),
estimated AS (
    SELECT
        r.*,
        now() + GREATEST(r.remaining_minutes, r.work_ahead_minutes / c.parallel_stations) * interval '1 minute'
            AS estimated_ready_at
    FROM ranked r
    CROSS JOIN kitchen_config c
)
SELECT
    order_id,
    user_id,
    full_name,
    pickup_code,
    order_status,
    items,
    total_amount,
    ordered_at,
    target_pickup_time,
    queue_position,
    estimated_ready_at,
    GREATEST(ceil(EXTRACT(EPOCH FROM estimated_ready_at - target_pickup_time) / 60), 0)::INT AS delay_minutes
FROM estimated;


CREATE VIEW order_latency AS
SELECT
    order_id,
    user_id,
    ordered_at,
    target_pickup_time,
    preparing_at,
    ready_at,
    completed_at,
    round(EXTRACT(EPOCH FROM ready_at - ordered_at) / 60, 1) AS wait_minutes,
    round(EXTRACT(EPOCH FROM ready_at - preparing_at) / 60, 1) AS cook_minutes,
    ready_at <= target_pickup_time AS ready_on_time
FROM orders
WHERE order_status = 'COMPLETED';


CREATE VIEW break_demand AS
SELECT
    EXTRACT(HOUR FROM target_pickup_time)::INT AS pickup_hour,
    COUNT(*) AS orders,
    round(AVG(wait_minutes), 1) AS avg_wait_minutes,
    round(100 * AVG(ready_on_time::INT), 1) AS on_time_percent
FROM order_latency
GROUP BY pickup_hour;


CREATE VIEW item_sales AS
SELECT
    m.item_id,
    m.item_name,
    COALESCE(SUM(oi.quantity), 0) AS units_sold,
    COALESCE(SUM(oi.quantity * oi.item_price_at_order), 0) AS revenue
FROM menu_items m
LEFT JOIN order_items oi
    ON oi.item_id = m.item_id
    AND oi.order_id IN (SELECT order_id FROM orders WHERE order_status <> 'CANCELLED')
GROUP BY m.item_id;

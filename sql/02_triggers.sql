CREATE FUNCTION deduct_inventory() RETURNS trigger AS $$
BEGIN
    UPDATE menu_items
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE item_id = NEW.item_id
      AND is_available
      AND stock_quantity >= NEW.quantity
    RETURNING price INTO NEW.item_price_at_order;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock for %',
            COALESCE((SELECT item_name FROM menu_items WHERE item_id = NEW.item_id), 'item ' || NEW.item_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deduct_inventory
BEFORE INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION deduct_inventory();


CREATE FUNCTION enqueue_order() RETURNS trigger AS $$
BEGIN
    INSERT INTO kitchen_queue (order_id) VALUES (NEW.order_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enqueue_order
AFTER INSERT ON orders
FOR EACH ROW WHEN (NEW.order_status = 'QUEUED')
EXECUTE FUNCTION enqueue_order();


CREATE FUNCTION change_order_status() RETURNS trigger AS $$
BEGIN
    IF (OLD.order_status, NEW.order_status) NOT IN (
        ('QUEUED', 'PREPARING'),
        ('QUEUED', 'CANCELLED'),
        ('PREPARING', 'READY_FOR_PICKUP'),
        ('READY_FOR_PICKUP', 'COMPLETED')
    ) THEN
        RAISE EXCEPTION 'Invalid status change % -> %', OLD.order_status, NEW.order_status;
    END IF;

    CASE NEW.order_status
        WHEN 'PREPARING' THEN NEW.preparing_at := now();
        WHEN 'READY_FOR_PICKUP' THEN NEW.ready_at := now();
        WHEN 'COMPLETED' THEN NEW.completed_at := now();
        WHEN 'CANCELLED' THEN NEW.cancelled_at := now();
    END CASE;

    IF NEW.order_status = 'CANCELLED' THEN
        UPDATE menu_items m
        SET stock_quantity = m.stock_quantity + oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.order_id AND m.item_id = oi.item_id;
    END IF;

    IF NEW.order_status IN ('READY_FOR_PICKUP', 'CANCELLED') THEN
        DELETE FROM kitchen_queue WHERE order_id = NEW.order_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_change
BEFORE UPDATE OF order_status ON orders
FOR EACH ROW WHEN (OLD.order_status IS DISTINCT FROM NEW.order_status)
EXECUTE FUNCTION change_order_status();


CREATE FUNCTION place_order(p_user_id INT, p_pickup_time TIMESTAMPTZ, p_items JSONB)
RETURNS INT AS $$
DECLARE
    new_order_id INT;
BEGIN
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item';
    END IF;

    INSERT INTO orders (user_id, target_pickup_time)
    VALUES (p_user_id, p_pickup_time)
    RETURNING order_id INTO new_order_id;

    INSERT INTO order_items (order_id, item_id, quantity)
    SELECT new_order_id, item_id, SUM(quantity)
    FROM jsonb_to_recordset(p_items) AS i(item_id INT, quantity INT)
    GROUP BY item_id
    ORDER BY item_id;

    RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;

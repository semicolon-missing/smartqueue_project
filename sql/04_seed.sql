INSERT INTO users (full_name, email, password_hash, user_role)
SELECT full_name, email, crypt('password123', gen_salt('bf')), user_role
FROM (VALUES
    ('Cafeteria Admin', 'admin@smartqueue.local', 'ADMIN'),
    ('Ravi Kumar', 'ravi.staff@smartqueue.local', 'STAFF'),
    ('Sunita Devi', 'sunita.staff@smartqueue.local', 'STAFF'),
    ('Dr. Meera Iyer', 'meera.iyer@smartqueue.local', 'FACULTY'),
    ('Prof. Arjun Rao', 'arjun.rao@smartqueue.local', 'FACULTY'),
    ('Aarav Sharma', 'aarav@smartqueue.local', 'STUDENT'),
    ('Diya Patel', 'diya@smartqueue.local', 'STUDENT'),
    ('Kabir Singh', 'kabir@smartqueue.local', 'STUDENT'),
    ('Ananya Gupta', 'ananya@smartqueue.local', 'STUDENT'),
    ('Rohan Verma', 'rohan@smartqueue.local', 'STUDENT'),
    ('Ishita Nair', 'ishita@smartqueue.local', 'STUDENT')
) AS u(full_name, email, user_role);

INSERT INTO menu_items (item_name, category, price, base_prep_time_minutes, stock_quantity, is_available) VALUES
    ('Veg Sandwich', 'Sandwich Mania', 30, 4, 60, TRUE),
    ('Grilled Veg Sandwich', 'Sandwich Mania', 40, 6, 50, TRUE),
    ('Grilled Cheese Sandwich', 'Sandwich Mania', 49, 6, 50, TRUE),
    ('Grilled Pizza Cheese Sandwich', 'Sandwich Mania', 69, 7, 40, TRUE),
    ('Grilled Egg Sandwich', 'Sandwich Mania', 59, 7, 40, TRUE),
    ('Aloo Paratha', 'North Indian', 59, 10, 40, TRUE),
    ('Pyaz Paratha', 'North Indian', 59, 10, 40, TRUE),
    ('Gobhi Paratha', 'North Indian', 59, 10, 30, TRUE),
    ('Paneer Paratha', 'North Indian', 69, 10, 4, TRUE),
    ('Mix Paratha', 'North Indian', 69, 10, 30, TRUE),
    ('Rajma Chawal', 'North Indian', 64, 5, 40, TRUE),
    ('Choley Chawal', 'North Indian', 64, 5, 40, TRUE),
    ('Kadhi Chawal', 'North Indian', 64, 5, 30, FALSE),
    ('Amritsari Kulcha Thali', 'Mini Thali', 79, 12, 30, TRUE),
    ('Dal Makhani Laccha Paratha Thali', 'Mini Thali', 79, 12, 30, TRUE),
    ('Dahi (add-on)', 'Mini Thali', 10, 1, 80, TRUE),
    ('Hakka Noodles', 'Chinese', 69, 8, 50, TRUE),
    ('Chilli Garlic Noodles', 'Chinese', 69, 8, 50, TRUE),
    ('Veg Fried Rice', 'Chinese', 59, 8, 50, TRUE),
    ('Manchurian Gravy (add-on)', 'Chinese', 30, 3, 60, TRUE),
    ('Chilli Paneer Gravy (add-on)', 'Chinese', 30, 3, 40, TRUE),
    ('Spring Rolls Veg', 'Chinese', 45, 7, 40, TRUE),
    ('Kurkure Spring Rolls Veg', 'Chinese', 49, 7, 40, TRUE),
    ('French Fries', 'Chinese', 45, 5, 80, TRUE),
    ('Peri Peri French Fries', 'Chinese', 49, 5, 80, TRUE),
    ('Cheesy French Fries', 'Chinese', 64, 6, 60, TRUE),
    ('Chilli Potato', 'Chinese', 59, 7, 50, TRUE),
    ('Honey Potato', 'Chinese', 69, 7, 50, TRUE),
    ('Steamed Momos Veg (4 pc)', 'Momos', 35, 6, 80, TRUE),
    ('Steamed Momos Veg (8 pc)', 'Momos', 59, 6, 60, TRUE),
    ('Fried Momos Veg (4 pc)', 'Momos', 45, 8, 60, TRUE),
    ('Fried Momos Veg (8 pc)', 'Momos', 65, 8, 50, TRUE),
    ('Gravy Momos Veg (4 pc)', 'Momos', 55, 9, 40, TRUE),
    ('Gravy Momos Veg (8 pc)', 'Momos', 75, 9, 40, TRUE),
    ('Kurkure Momos Veg (4 pc)', 'Momos', 65, 9, 40, TRUE),
    ('Kurkure Momos Veg (8 pc)', 'Momos', 85, 9, 40, TRUE),
    ('Tandoori Momos Veg (4 pc)', 'Momos', 70, 10, 30, TRUE),
    ('Tandoori Momos Veg (8 pc)', 'Momos', 89, 10, 30, TRUE),
    ('Steamed Momos Paneer (4 pc)', 'Momos', 45, 6, 50, TRUE),
    ('Steamed Momos Paneer (8 pc)', 'Momos', 69, 6, 40, TRUE),
    ('Fried Momos Paneer (4 pc)', 'Momos', 65, 8, 40, TRUE),
    ('Fried Momos Paneer (8 pc)', 'Momos', 85, 8, 40, TRUE),
    ('Gravy Momos Paneer (4 pc)', 'Momos', 65, 9, 30, TRUE),
    ('Gravy Momos Paneer (8 pc)', 'Momos', 85, 9, 30, TRUE),
    ('Kurkure Momos Paneer (4 pc)', 'Momos', 75, 9, 30, TRUE),
    ('Kurkure Momos Paneer (8 pc)', 'Momos', 95, 9, 30, TRUE),
    ('Bread Pakoda', 'Snacks', 20, 3, 80, TRUE),
    ('Bread Pakoda (Paneer)', 'Snacks', 30, 3, 60, TRUE),
    ('Samosa (Aloo/Matar)', 'Snacks', 20, 2, 150, TRUE),
    ('Samosa (Pizza)', 'Snacks', 30, 2, 80, TRUE),
    ('Samosa Chaat', 'Snacks', 45, 4, 50, TRUE),
    ('Dahi Ke Sholay', 'Snacks', 49, 6, 40, TRUE),
    ('Wafers', 'Snacks', 20, 1, 100, TRUE),
    ('Peanuts / Namkeen', 'Snacks', 10, 1, 100, TRUE),
    ('Biscuits', 'Snacks', 10, 1, 100, TRUE),
    ('Masala Adraki Chai', 'Hot Beverages', 20, 3, 200, TRUE),
    ('Kulhad Masala Adraki Chai', 'Hot Beverages', 25, 3, 120, TRUE),
    ('Tomato Soup', 'Hot Beverages', 30, 4, 60, TRUE),
    ('Hot & Sour Soup', 'Hot Beverages', 30, 4, 60, TRUE),
    ('Sweet Corn Soup', 'Hot Beverages', 30, 4, 60, TRUE),
    ('Manchow Soup', 'Hot Beverages', 40, 4, 60, TRUE),
    ('Americano', 'Coffee', 25, 3, 100, TRUE),
    ('Latte', 'Coffee', 34, 3, 100, TRUE),
    ('Cappuccino', 'Coffee', 40, 3, 100, TRUE),
    ('Cold Coffee', 'Cold Beverages', 49, 3, 100, TRUE),
    ('Kulhad Punjabi Lassi', 'Cold Beverages', 59, 2, 60, TRUE),
    ('Bisleri Water Bottle', 'Cold Beverages', 20, 1, 200, TRUE),
    ('Cold Drinks', 'Cold Beverages', 40, 1, 120, TRUE),
    ('Juices / Energy Drinks', 'Cold Beverages', 30, 1, 80, TRUE),
    ('Amul Ice Cream', 'Desserts', 40, 1, 0, TRUE);

ALTER TABLE order_items DISABLE TRIGGER trg_deduct_inventory;

DO $$
DECLARE
    pickup TIMESTAMPTZ;
    placed TIMESTAMPTZ;
    started TIMESTAMPTZ;
    ready TIMESTAMPTZ;
    new_order_id INT;
BEGIN
    PERFORM setseed(0.42);

    FOR day_offset IN 1..7 LOOP
        FOR break_hour IN 9..15 LOOP
            pickup := date_trunc('day', now()) - day_offset * interval '1 day'
                + break_hour * interval '1 hour' + interval '50 minutes';

            FOR n IN 1..(3 + floor(random() * 6))::INT LOOP
                placed := pickup - (10 + random() * 40) * interval '1 minute';
                started := placed + (1 + random() * 5) * interval '1 minute';
                ready := started + (2 + random() * 12) * interval '1 minute';

                INSERT INTO orders (user_id, order_status, ordered_at, target_pickup_time, preparing_at, ready_at, completed_at)
                SELECT user_id, 'COMPLETED', placed, pickup, started, ready, ready + random() * interval '5 minutes'
                FROM users
                WHERE user_role IN ('STUDENT', 'FACULTY')
                ORDER BY random()
                LIMIT 1
                RETURNING order_id INTO new_order_id;

                INSERT INTO order_items (order_id, item_id, quantity, item_price_at_order)
                SELECT new_order_id, item_id, 1 + floor(random() * 2)::INT, price
                FROM menu_items
                ORDER BY random()
                LIMIT 1 + floor(random() * 3)::INT;
            END LOOP;
        END LOOP;
    END LOOP;
END;
$$;

ALTER TABLE order_items ENABLE TRIGGER trg_deduct_inventory;

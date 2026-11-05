# CampusBite: Predictive Pre-Ordering & Queue-Management DBMS
**Document Version:** 1.0.0  
**Project Track:** Database Management Systems (DBMS) Laboratory / Capstone  
**Target Domain:** Campus Cafeteria & Fast-Casual Retail Optimization  

---

## 1. Executive Summary & Problem Formulation

### 1.1 The Operational Bottleneck
University cafeterias and high-traffic food kiosks face severe demand spikes during 10-to-15-minute inter-lecture breaks. This creates three critical failures:
1. **Severe Counter Congestion:** Physical queue lengths exceed counter dispatch bandwidth, causing wait times of 20–30 minutes and resulting in students missing class or abandoning orders.
2. **Information Asymmetry:** Students have no visibility into live kitchen backlog or depleted stock before physically arriving at the counter, frequently ordering items that cannot be prepared before their next lecture.
3. **Concurrency & Overselling:** Multiple simultaneous orders placed during rush intervals lead to phantom stock deductions, negative inventory states, and operational chaos in the kitchen.

### 1.2 Proposed Solution
**CampusBite** is an ACID-compliant, transaction-hardened Relational Database Management System (RDBMS). It enables classroom pre-ordering, provides real-time preparation time estimation, classifies menu items into turn-around tiers (e.g., `GRAB_AND_GO`), and enforces deterministic inventory checks via database-level triggers.

---

## 2. Technical System Architecture

```text
[ Client Layer (CLI / Web / Mobile App) ]
                   │
                   ▼ (Parametrized SQL Queries & Transactions)
[ Backend Connector & Transaction Manager (Python / SQLite / PostgreSQL) ]
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
[ Relational Engine ]   [ Dynamic Logic & Guards ]
├── `users`             ├── Trigger: `trg_deduct_inventory` (Stock Guard)
├── `menu_items`        ├── Priority Window Queries (Backlog Projection)
├── `orders`            └── Speed Tiers: `GRAB_AND_GO` (Prep <= 3 mins)
├── `order_items`
└── `kitchen_queue`
```

---

## 3. Relational Schema Design (DDL & Constraints)

The database schema guarantees 3NF normalization, referential integrity via cascading constraints, and domain-level integrity via `CHECK` constraints.

### 3.1 Entities & Descriptions
* **`users`**: Manages customer profiles (`STUDENT`, `FACULTY`) and back-of-house staff.
* **`menu_items`**: Maintains unit costs, real-time stock levels, and baseline preparation durations.
* **`orders`**: Tracks order timestamps, designated future pickup times, and status transitions (`QUEUED`, `PREPARING`, `READY_FOR_PICKUP`, `COMPLETED`, `CANCELLED`).
* **`order_items`**: Normalizes the Many-to-Many relationship between orders and menu items, freezing historical item prices at checkout.
* **`kitchen_queue`**: Maintains live FIFO/Priority-queue indexing for back-of-house fulfillment.

### 3.2 SQL DDL Schema (`sql/01_schema.sql`)
```sql
CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    user_role VARCHAR(20) CHECK (user_role IN ('STUDENT', 'FACULTY', 'STAFF', 'ADMIN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menu_items (
    item_id VARCHAR(20) PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(8, 2) NOT NULL CHECK (price >= 0),
    base_prep_time_minutes INT NOT NULL CHECK (base_prep_time_minutes > 0),
    stock_quantity INT NOT NULL CHECK (stock_quantity >= 0)
);

CREATE TABLE orders (
    order_id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    order_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    target_pickup_time TIMESTAMP NOT NULL,
    order_status VARCHAR(20) DEFAULT 'QUEUED' 
        CHECK (order_status IN ('QUEUED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE order_items (
    order_item_id VARCHAR(30) PRIMARY KEY,
    order_id VARCHAR(30) NOT NULL,
    item_id VARCHAR(20) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    item_price_at_order DECIMAL(8, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES menu_items(item_id)
);

CREATE TABLE kitchen_queue (
    queue_id VARCHAR(30) PRIMARY KEY,
    order_id VARCHAR(30) UNIQUE NOT NULL,
    queue_position INT NOT NULL,
    accumulated_delay_minutes INT DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
```

---

## 4. Analytical Views & Transactional Triggers

### 4.1 Stock Depletion & Concurrency Guard (`sql/03_triggers_and_procedures.sql`)
To eliminate overselling during flash-crowd checkout, a database trigger intercepts every line-item insertion:

```sql
CREATE TRIGGER trg_deduct_inventory
BEFORE INSERT ON order_items
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN (SELECT stock_quantity FROM menu_items WHERE item_id = NEW.item_id) < NEW.quantity
        THEN RAISE(ABORT, 'Transaction Aborted: Insufficient stock available.')
    END;

    UPDATE menu_items
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE item_id = NEW.item_id;
END;
```

### 4.2 Fast Food Query for Tight Class Breaks (`sql/04_analytical_queries.sql`)
```sql
SELECT 
    item_id,
    item_name,
    price,
    base_prep_time_minutes,
    stock_quantity,
    CASE 
        WHEN base_prep_time_minutes <= 3 THEN 'GRAB_AND_GO'
        WHEN base_prep_time_minutes <= 7 THEN 'QUICK_COOK'
        ELSE 'STANDARD_PREP'
    END AS turnaround_tier
FROM menu_items
WHERE stock_quantity > 0
ORDER BY base_prep_time_minutes ASC, stock_quantity DESC;
```

---

## 5. Team Responsibility Matrix & Project Agenda

The project timeline is structured across three development sprints, dividing tasks among team members:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CAMPUSBITE SPRINT ROADMAP                       │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ Student 1          │ Student 2          │ Student 3                    │
│ (Schema & Storage) │ (Engine & Triggers)│ (CLI App & Analytics)        │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ • Relational DDL   │ • Inventory Trigger│ • Interactive CLI App        │
│ • Foreign Keys     │ • Live Queue Index │ • Wait-Time Projections      │
│ • Seed Datasets    │ • Concurrency Test │ • Latency Audit Reports      │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

### Sprint 1: Architecture & Baseline Modeling
* **Student 1:** Draft 3NF normalized schema, implement foreign key constraints, and prepare seed datasets (`sql/01_schema.sql`, `sql/02_seed.sql`).
* **Student 2:** Implement atomic checkout transactions and test base insertion routines.
* **Student 3:** Initialize project repository, configure `.gitignore`, and establish database connection wrappers.

### Sprint 2: Automated Rules & Queue Computation
* **Student 1:** Construct analytical indexing queries (`sql/04_analytical_queries.sql`) for fastest-available food filtering.
* **Student 2:** Implement and unit-test `trg_deduct_inventory` to ensure negative inventory is impossible.
* **Student 3:** Build the terminal CLI interface (`src/cli_app.py`) for placing pre-orders and viewing live stock.

### Sprint 3: Stress Testing, Reporting & Verification
* **Student 1:** Run stress tests simulating burst traffic (100 simultaneous orders across class transition intervals).
* **Student 2:** Measure queue position latency and cumulative delay estimation metrics.
* **Student 3:** Generate audit logs (`reports/queue_latency_audit.csv`) and draft the final presentation documentation.

---

## 6. Verification & Mentor Demonstration Checklist

* [ ] **Schema Check:** All 5 relational tables initialized with appropriate data types and constraints.
* [ ] **ACID Verification:** Attempt to order more units than in stock; verify the trigger raises an `ABORT` and rolls back the transaction.
* [ ] **Speed-Tier Query:** Execute the analytical menu query to confirm instant sub-3-minute items display at the top.
* [ ] **Queue Dispatch:** Place a valid pre-order and verify that the entry is automatically added to `kitchen_queue`.
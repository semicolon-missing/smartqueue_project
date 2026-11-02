import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { CUSTOMER, useAuth } from "../auth";
import { Loading, Tabs } from "../components/ui";
import { clock, pickupSlots, rupees, TIERS } from "../format";
import { useLive } from "../useLive";

const CART_KEY = "smartqueue.cart";
const loadMenu = () => api("/menu");

const FILTERS = [
  ["ALL", "All"],
  ["GRAB_AND_GO", "Grab & go"],
  ["QUICK_COOK", "Quick cook"],
  ["STANDARD_PREP", "Made fresh"],
];

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function readCart() {
  try {
    return JSON.parse(sessionStorage.getItem(CART_KEY)) ?? {};
  } catch {
    return {};
  }
}

function groupByCategory(items) {
  const groups = new Map();
  [...items]
    .sort((a, b) => a.item_id - b.item_id)
    .forEach((item) => groups.set(item.category, [...(groups.get(item.category) ?? []), item]));
  return [...groups];
}

const maxFor = (item) => (item.is_orderable ? Math.min(item.stock_quantity, 20) : 0);

export default function Menu() {
  const { data } = useLive(loadMenu, 15000);
  const navigate = useNavigate();
  const [cart, setCart] = useState(readCart);
  const [tier, setTier] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => sessionStorage.setItem(CART_KEY, JSON.stringify(cart)), [cart]);

  if (!data) return <Loading />;

  const byId = Object.fromEntries(data.items.map((item) => [item.item_id, item]));
  const lines = Object.entries(cart)
    .map(([id, quantity]) => ({ item: byId[id], quantity }))
    .filter((line) => line.item?.is_orderable);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.quantity * Number(line.item.price), 0);

  const visible = data.items.filter(
    (item) =>
      (tier === "ALL" || item.turnaround_tier === tier) &&
      item.item_name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const sections = groupByCategory(visible);

  function change(itemId, delta) {
    setCart((current) => {
      const next = { ...current, [itemId]: (current[itemId] ?? 0) + delta };
      if (next[itemId] <= 0) delete next[itemId];
      return next;
    });
  }

  function placed(order) {
    setCart({});
    navigate(`/orders/${order.order_id}`);
  }

  const panel = (
    <OrderPanel
      lines={lines}
      total={total}
      wait={data.estimated_wait_minutes}
      onChange={change}
      onClear={() => setCart({})}
      onPlaced={placed}
    />
  );

  return (
    <section className="container page">
      <div className="page-head">
        <div>
          <h1>Menu</h1>
          <p className="muted">
            {data.queue_length} {data.queue_length === 1 ? "order" : "orders"} in the kitchen · about{" "}
            {data.estimated_wait_minutes} min wait
          </p>
        </div>
      </div>

      <div className="menu-layout">
        <div>
          <div className="menu-tools">
            <Tabs value={tier} onChange={setTier} options={FILTERS} />
            <input
              type="search"
              className="search"
              placeholder="Search the menu"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search the menu"
            />
          </div>

          <nav className="category-nav" aria-label="Categories">
            {sections.map(([category]) => (
              <a key={category} href={`#${slug(category)}`}>
                {category}
              </a>
            ))}
          </nav>

          {sections.length === 0 && <p className="empty">Nothing matches that search.</p>}

          {sections.map(([category, items]) => (
            <section key={category} id={slug(category)} className="menu-section">
              <h2>
                {category}
                <span className="count">{items.length}</span>
              </h2>
              <ul>
                {items.map((item) => (
                  <MenuRow
                    key={item.item_id}
                    item={item}
                    quantity={cart[item.item_id] ?? 0}
                    onChange={(delta) => change(item.item_id, delta)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="order-aside">{panel}</aside>
      </div>

      {count > 0 && (
        <div className="cart-bar">
          <span>
            {count} {count === 1 ? "item" : "items"} · <span className="price">{rupees(total)}</span>
          </span>
          <button className="button small" onClick={() => setSheetOpen(true)}>
            Review order
          </button>
        </div>
      )}

      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <button className="link sheet-close" onClick={() => setSheetOpen(false)}>
              Close
            </button>
            {panel}
          </div>
        </div>
      )}
    </section>
  );
}

function MenuRow({ item, quantity, onChange }) {
  return (
    <li className={`menu-row ${item.is_orderable ? "" : "is-out"}`}>
      <div className="menu-row-main">
        <span className="menu-name">{item.item_name}</span>
        <span className="leader" />
        <span className="price">{rupees(item.price)}</span>
      </div>
      <div className="menu-row-meta">
        <span>
          <span className={`tier-dot tier-${item.turnaround_tier}`} />
          {item.base_prep_time_minutes} min · {TIERS[item.turnaround_tier]}
        </span>
        {!item.is_orderable && <span className="tag">{item.is_available ? "Sold out" : "Not today"}</span>}
        {item.is_orderable && item.is_low_stock && <span className="tag warn">Only {item.stock_quantity} left</span>}
      </div>
      <Stepper name={item.item_name} quantity={quantity} max={maxFor(item)} onChange={onChange} />
    </li>
  );
}

function Stepper({ name, quantity, max, onChange }) {
  if (quantity === 0) {
    return (
      <button className="add" onClick={() => onChange(1)} disabled={max === 0} aria-label={`Add ${name}`}>
        Add
      </button>
    );
  }
  return (
    <span className="stepper">
      <button onClick={() => onChange(-1)} aria-label={`Remove one ${name}`}>
        −
      </button>
      <span>{quantity}</span>
      <button onClick={() => onChange(1)} disabled={quantity >= max} aria-label={`Add one more ${name}`}>
        +
      </button>
    </span>
  );
}

function OrderPanel({ lines, total, wait, onChange, onClear, onPlaced }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slotIndex, setSlotIndex] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const longestPrep = Math.max(0, ...lines.map((line) => line.item.base_prep_time_minutes));
  const slots = pickupSlots(Math.max(wait, longestPrep) + 5);
  const canOrder = !user || CUSTOMER.includes(user.user_role);

  async function place() {
    if (!user) return navigate("/login", { state: { from: "/menu" } });
    setBusy(true);
    setError("");
    try {
      const order = await api("/orders", {
        method: "POST",
        body: {
          pickup_time: slots[slotIndex].time.toISOString(),
          items: lines.map((line) => ({ item_id: line.item.item_id, quantity: line.quantity })),
        },
      });
      onPlaced(order);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="ticket">
      <div className="ticket-head">
        <span className="eyebrow">Your order</span>
        {lines.length > 0 && (
          <button className="link small" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="empty">Nothing here yet. Items marked grab &amp; go are ready in three minutes or less.</p>
      ) : (
        <>
          <ul className="cart-lines">
            {lines.map(({ item, quantity }) => (
              <li key={item.item_id}>
                <span>{item.item_name}</span>
                <Stepper
                  name={item.item_name}
                  quantity={quantity}
                  max={maxFor(item)}
                  onChange={(delta) => onChange(item.item_id, delta)}
                />
                <span className="price">{rupees(quantity * item.price)}</span>
              </li>
            ))}
          </ul>

          <div className="tear" />

          <p className="eyebrow">Pickup time</p>
          <div className="slots">
            {slots.map((slot, i) => (
              <button
                key={slot.time.getTime()}
                type="button"
                className={`slot ${i === slotIndex ? "active" : ""}`}
                onClick={() => setSlotIndex(i)}
              >
                <span className="slot-time">{clock(slot.time)}</span>
                <span className="slot-label">{slot.label}</span>
              </button>
            ))}
          </div>

          <div className="total-row">
            <span>Total · pay at pickup</span>
            <strong className="price">{rupees(total)}</strong>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="button block" onClick={place} disabled={busy || !canOrder}>
            {!user ? "Log in to order" : !canOrder ? "Staff accounts can't order" : busy ? "Placing…" : "Place order"}
          </button>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api";
import { Loading, Tabs } from "../components/ui";
import { clock } from "../format";
import { useLive } from "../useLive";

const loadBoard = () => api("/kitchen/board");
const loadMenu = () => api("/menu");

const NEXT = {
  QUEUED: ["PREPARING", "Start"],
  PREPARING: ["READY_FOR_PICKUP", "Mark ready"],
  READY_FOR_PICKUP: ["COMPLETED", "Collected"],
};

function useNow(intervalMs) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export default function Kitchen() {
  const [tab, setTab] = useState("board");
  const now = useNow(30000);

  return (
    <section className="container page">
      <div className="page-head">
        <div>
          <h1>Kitchen</h1>
          <p className="muted mono">{clock(now)}</p>
        </div>
        <Tabs value={tab} onChange={setTab} options={[["board", "Board"], ["stock", "Stock"]]} />
      </div>
      {tab === "board" ? <Board /> : <Stock />}
    </section>
  );
}

function Board() {
  const { data, error, refresh } = useLive(loadBoard, 4000);
  const [actionError, setActionError] = useState("");

  if (!data) return <Loading />;

  async function move(order, status) {
    try {
      await api(`/kitchen/orders/${order.order_id}/status`, { method: "POST", body: { status } });
      setActionError("");
    } catch (err) {
      setActionError(err.message);
    }
    refresh();
  }

  const columns = [
    ["Queued", data.queue.filter((order) => order.order_status === "QUEUED")],
    ["Preparing", data.queue.filter((order) => order.order_status === "PREPARING")],
    ["Ready", data.ready],
  ];

  return (
    <>
      <div className="board-tools">
        <PickupForm onDone={refresh} />
        {data.low_stock.length > 0 && (
          <p className="low-stock">
            <span className="eyebrow">Low stock</span>
            {data.low_stock.map((item) => `${item.item_name} (${item.stock_quantity})`).join(" · ")}
          </p>
        )}
      </div>
      {(actionError || error) && <p className="error">{actionError || error}</p>}

      <div className="board">
        {columns.map(([title, orders]) => (
          <div key={title} className="board-column">
            <h2 className="column-title">
              {title}
              <span className="count">{orders.length}</span>
            </h2>
            {orders.length === 0 && <p className="empty">Nothing here</p>}
            {orders.map((order) => (
              <KitchenTicket key={order.order_id} order={order} onMove={move} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function KitchenTicket({ order, onMove }) {
  const [nextStatus, label] = NEXT[order.order_status];
  const late = order.delay_minutes > 0;

  return (
    <article className={`kitchen-ticket ${late ? "is-late" : ""}`}>
      <header>
        <span>#{order.order_id}</span>
        <span>pickup {clock(order.target_pickup_time)}</span>
      </header>
      <ul className="ticket-items">
        {order.items.split(", ").map((line) => {
          const [, quantity, name] = line.match(/^(\d+) x (.+)$/) ?? [null, "", line];
          return (
            <li key={name}>
              <strong>{quantity}×</strong> {name}
            </li>
          );
        })}
      </ul>
      <p className="ticket-meta">
        {order.full_name} · <span className="mono">{order.pickup_code}</span>
      </p>
      {order.estimated_ready_at && (
        <p className="ticket-meta">
          Est. ready {clock(order.estimated_ready_at)}
          {late && ` · ${order.delay_minutes} min late`}
        </p>
      )}
      {order.ready_at && <p className="ticket-meta">Ready since {clock(order.ready_at)}</p>}
      <div className="ticket-actions">
        {order.order_status === "QUEUED" && (
          <button className="link danger small" onClick={() => onMove(order, "CANCELLED")}>
            Cancel
          </button>
        )}
        <button className="button small" onClick={() => onMove(order, nextStatus)}>
          {label}
        </button>
      </div>
    </article>
  );
}

function PickupForm({ onDone }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(null);

  async function submit(event) {
    event.preventDefault();
    try {
      const order = await api("/kitchen/pickup", { method: "POST", body: { pickup_code: code } });
      setMessage({ ok: true, text: `#${order.order_id} handed to ${order.full_name}` });
      setCode("");
      onDone();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    }
  }

  return (
    <form className="pickup-form" onSubmit={submit}>
      <input
        className="mono"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="CODE"
        maxLength={6}
        aria-label="Pickup code"
      />
      <button className="button" disabled={code.length < 6}>
        Hand over
      </button>
      {message && <span className={message.ok ? "ok-text" : "error"}>{message.text}</span>}
    </form>
  );
}

function Stock() {
  const { data, refresh } = useLive(loadMenu, 15000);
  const [search, setSearch] = useState("");

  if (!data) return <Loading />;

  const items = [...data.items]
    .sort((a, b) => a.item_id - b.item_id)
    .filter((item) => item.item_name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <input
        type="search"
        className="search"
        placeholder="Find an item"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Find an item"
      />
      <ul className="stock-list">
        {items.map((item) => (
          <StockRow key={item.item_id} item={item} onSaved={refresh} />
        ))}
      </ul>
    </>
  );
}

function StockRow({ item, onSaved }) {
  const [stock, setStock] = useState(item.stock_quantity);
  const [error, setError] = useState("");

  useEffect(() => setStock(item.stock_quantity), [item.stock_quantity]);

  async function save(fields) {
    try {
      await api(`/kitchen/items/${item.item_id}`, { method: "PATCH", body: fields });
      setError("");
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <li className={`stock-row ${item.is_low_stock ? "is-low" : ""}`}>
      <div>
        <span>{item.item_name}</span>
        <span className="small muted">{item.category}</span>
      </div>
      <form
        className="stock-form"
        onSubmit={(event) => {
          event.preventDefault();
          save({ stock_quantity: Number(stock) });
        }}
      >
        <input
          type="number"
          min="0"
          value={stock}
          onChange={(event) => setStock(event.target.value)}
          aria-label={`Stock for ${item.item_name}`}
        />
        {Number(stock) !== item.stock_quantity && <button className="button small">Save</button>}
      </form>
      <label className="switch">
        <input
          type="checkbox"
          checked={item.is_available}
          onChange={(event) => save({ is_available: event.target.checked })}
        />
        <span>{item.is_available ? "On menu" : "Off"}</span>
      </label>
      {error && <p className="error">{error}</p>}
    </li>
  );
}

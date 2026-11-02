import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { Loading, PriceLine, StatusPill } from "../components/ui";
import { clock, ordinal, rupees, STATUS } from "../format";
import { useLive } from "../useLive";

const FLOW = ["QUEUED", "PREPARING", "READY_FOR_PICKUP", "COMPLETED"];

function headline(order) {
  switch (order.order_status) {
    case "QUEUED":
      return `${ordinal(order.queue_position)} in line · ready around ${clock(order.estimated_ready_at)}`;
    case "PREPARING":
      return `Being made now · ready around ${clock(order.estimated_ready_at)}`;
    case "READY_FOR_PICKUP":
      return "Ready at the counter. Show this code.";
    case "COMPLETED":
      return `Collected at ${clock(order.completed_at)}. Enjoy.`;
    default:
      return "This order was cancelled.";
  }
}

export default function Order() {
  const { orderId } = useParams();
  const load = useCallback(() => api(`/orders/${orderId}`), [orderId]);
  const { data: order, error, refresh } = useLive(load, 5000);
  const [confirming, setConfirming] = useState(false);
  const [cancelError, setCancelError] = useState("");

  if (!order) return error ? <p className="container loading error">{error}</p> : <Loading />;

  const step = FLOW.indexOf(order.order_status);
  const isActive = ["QUEUED", "PREPARING"].includes(order.order_status);

  async function cancel() {
    try {
      await api(`/orders/${orderId}/cancel`, { method: "POST" });
      refresh();
    } catch (err) {
      setCancelError(err.message);
    }
    setConfirming(false);
  }

  return (
    <section className="container narrow page">
      <Link to="/orders" className="link small">
        ← All orders
      </Link>

      <article className={`ticket order-ticket ${order.order_status === "READY_FOR_PICKUP" ? "is-ready" : ""}`}>
        <header className="ticket-head">
          <span className="eyebrow">Order #{order.order_id}</span>
          <StatusPill status={order.order_status} />
        </header>

        <div className="code-block">
          <span className="eyebrow">Pickup code</span>
          <strong className="pickup-code">{order.pickup_code}</strong>
          <p className="headline">{headline(order)}</p>
          {isActive && order.delay_minutes > 0 && (
            <p className="note">Running about {order.delay_minutes} min behind your pickup time.</p>
          )}
        </div>

        {step >= 0 && (
          <ol className="progress">
            {FLOW.map((status, i) => (
              <li key={status} className={i < step ? "done" : i === step ? "current" : ""}>
                {STATUS[status]}
              </li>
            ))}
          </ol>
        )}

        <div className="tear" />

        <ul className="price-list">
          {order.lines.map((line) => (
            <PriceLine
              key={line.item_name}
              label={`${line.quantity} × ${line.item_name}`}
              amount={rupees(line.quantity * line.item_price_at_order)}
            />
          ))}
        </ul>
        <div className="total-row">
          <span>Total · pay at pickup</span>
          <strong className="price">{rupees(order.total_amount)}</strong>
        </div>

        <dl className="meta-grid">
          <div>
            <dt>Ordered</dt>
            <dd>{clock(order.ordered_at)}</dd>
          </div>
          <div>
            <dt>Pickup</dt>
            <dd>{clock(order.target_pickup_time)}</dd>
          </div>
        </dl>
      </article>

      {order.order_status === "QUEUED" && (
        <div className="cancel-row">
          {confirming ? (
            <>
              <span className="muted">Cancel this order?</span>
              <button className="button ghost small" onClick={() => setConfirming(false)}>
                Keep it
              </button>
              <button className="button danger small" onClick={cancel}>
                Yes, cancel
              </button>
            </>
          ) : (
            <button className="link danger" onClick={() => setConfirming(true)}>
              Cancel order
            </button>
          )}
        </div>
      )}
      {cancelError && <p className="error center">{cancelError}</p>}
    </section>
  );
}

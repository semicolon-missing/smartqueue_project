import { Link } from "react-router-dom";
import { api } from "../api";
import { Loading, StatusPill } from "../components/ui";
import { clock, day, rupees } from "../format";
import { useLive } from "../useLive";

const loadOrders = () => api("/orders");

export default function Orders() {
  const { data: orders } = useLive(loadOrders, 10000);

  if (!orders) return <Loading />;

  return (
    <section className="container narrow page">
      <h1>Your orders</h1>

      {orders.length === 0 ? (
        <p className="empty">
          No orders yet.{" "}
          <Link to="/menu" className="link">
            Browse the menu
          </Link>
        </p>
      ) : (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.order_id}>
              <Link to={`/orders/${order.order_id}`} className="order-row">
                <div>
                  <span className="mono small muted">
                    {day(order.ordered_at)} · pickup {clock(order.target_pickup_time)}
                  </span>
                  <span className="order-items">{order.items}</span>
                </div>
                <div className="order-row-end">
                  <StatusPill status={order.order_status} />
                  <span className="price">{rupees(order.total_amount)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

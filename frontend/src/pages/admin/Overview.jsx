import { useEffect, useState } from "react";
import { api, download } from "../../api";
import { Bars, Columns } from "../../components/Charts";
import { Loading, Panel } from "../../components/ui";
import { rupees } from "../../format";
import { useLive } from "../../useLive";

const loadReports = () => api("/admin/reports");

const breakLabel = (hour) => `${hour % 12 || 12}:50`;

function lastSevenDays(rows) {
  const ordersByDay = Object.fromEntries(rows.map((row) => [row.day, row.orders]));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    const orders = ordersByDay[date.toLocaleDateString("en-CA")] ?? 0;
    return {
      label: date.toLocaleDateString("en-IN", { weekday: "short" }),
      value: orders,
      tooltip: `${orders} orders · ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
    };
  });
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export default function Overview() {
  const { data, refresh } = useLive(loadReports, 30000);

  if (!data) return <Loading />;

  const { today } = data;

  return (
    <>
      <div className="stats">
        <Stat label="Orders today" value={today.orders} />
        <Stat label="Revenue today" value={rupees(today.revenue)} />
        <Stat label="Average wait" value={today.avg_wait_minutes == null ? "–" : `${today.avg_wait_minutes} min`} />
        <Stat label="Cancelled today" value={today.cancelled} />
      </div>

      <div className="panels">
        <Panel title="Orders by break" note="Completed orders by pickup slot, all time">
          <Columns
            data={data.break_demand.map((row) => ({
              label: breakLabel(row.pickup_hour),
              value: row.orders,
              tooltip: `${row.orders} orders · ${row.avg_wait_minutes} min avg wait · ${row.on_time_percent}% on time`,
            }))}
          />
        </Panel>
        <Panel title="Last 7 days" note="Orders per day">
          <Columns data={lastSevenDays(data.last_7_days)} />
        </Panel>
        <Panel title="Best sellers" note="Units sold, all time">
          <Bars
            data={data.item_sales.slice(0, 8).map((row) => ({
              label: row.item_name,
              value: row.units_sold,
              tooltip: `${row.units_sold} sold · ${rupees(row.revenue)}`,
            }))}
          />
        </Panel>
        <Panel title="Running low" note="At or below each item's alert level">
          {data.low_stock.length === 0 ? (
            <p className="empty">Everything is well stocked.</p>
          ) : (
            <ul className="low-list">
              {data.low_stock.map((item) => (
                <li key={item.item_id}>
                  <span>{item.item_name}</span>
                  <span className="mono warn-text">{item.stock_quantity === 0 ? "Out" : `${item.stock_quantity} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="panels">
        <Panel title="Kitchen capacity" note="How many orders can be cooked at once. Used for wait estimates.">
          <StationsForm current={data.kitchen.parallel_stations} onSaved={refresh} />
        </Panel>
        <Panel title="Latency audit" note="Every completed order with its wait and cook time.">
          <button className="button ghost" onClick={() => download("/admin/reports/latency.csv", "queue_latency_audit.csv")}>
            Download CSV
          </button>
        </Panel>
      </div>
    </>
  );
}

function StationsForm({ current, onSaved }) {
  const [value, setValue] = useState(current);

  useEffect(() => setValue(current), [current]);

  async function submit(event) {
    event.preventDefault();
    await api("/admin/stations", { method: "PUT", body: { parallel_stations: Number(value) } });
    onSaved();
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <input
        type="number"
        min="1"
        max="20"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Cooking stations"
      />
      <span className="muted">stations</span>
      <button className="button small" disabled={Number(value) === current}>
        Save
      </button>
    </form>
  );
}

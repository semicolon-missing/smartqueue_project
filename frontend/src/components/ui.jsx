import { STATUS } from "../format";

export function Loading() {
  return <p className="container loading">Loading…</p>;
}

export function StatusPill({ status }) {
  return <span className={`pill status-${status.toLowerCase()}`}>{STATUS[status]}</span>;
}

export function Tabs({ value, onChange, options }) {
  return (
    <div className="segmented" role="tablist">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          className={value === key ? "active" : ""}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Panel({ title, note, children }) {
  return (
    <section className="panel">
      <header>
        <h2>{title}</h2>
        {note && <p className="muted small">{note}</p>}
      </header>
      {children}
    </section>
  );
}

export function PriceLine({ label, amount }) {
  return (
    <li className="price-line">
      <span>{label}</span>
      <span className="leader" />
      <span className="price">{amount}</span>
    </li>
  );
}

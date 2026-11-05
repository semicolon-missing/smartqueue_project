import { Link } from "react-router-dom";
import { api } from "../api";
import { homeFor, useAuth } from "../auth";
import { PriceLine } from "../components/ui";
import { rupees, TIERS } from "../format";
import { useLive } from "../useLive";

const loadMenu = () => api("/menu");

const STEPS = [
  ["Order from your seat", "Browse the café menu with live stock and prep times while the lecture wraps up."],
  ["Choose your break", "Pick when you'll walk in. The kitchen lines your order up to be ready right then."],
  ["Skip the line", "Show your six-character code at the counter, collect, and go. Pay at pickup."],
];

const TIER_SCALE = [
  ["GRAB_AND_GO", "0–3 min", 3],
  ["QUICK_COOK", "4–7 min", 4],
  ["STANDARD_PREP", "8+ min", 5],
];

export default function Landing() {
  const { user } = useAuth();
  const { data } = useLive(loadMenu, 15000);
  const items = data?.items ?? [];
  const quick = items
    .filter((i) => i.is_orderable && i.turnaround_tier === "GRAB_AND_GO" && i.base_prep_time_minutes > 1)
    .slice(0, 5);

  return (
    <>
      <section className="container hero">
        <div>
          <p className="eyebrow">Campus café · Pre-ordering</p>
          <h1>
            Order in class.
            <br />
            <em>Collect</em> at the break.
          </h1>
          <p className="lede">
            CampusBite sends your order to the kitchen ahead of time, so it's ready when the lecture ends, not
            halfway through your break.
          </p>
          <div className="actions">
            <Link to="/menu" className="button">
              Browse the menu
            </Link>
            {user ? (
              <Link to={homeFor(user)} className="button ghost">
                Continue as {user.full_name.split(" ")[0]}
              </Link>
            ) : (
              <Link to="/login" className="button ghost">
                Log in
              </Link>
            )}
          </div>
        </div>

        <aside className="ticket hero-ticket" aria-live="polite">
          <div className="ticket-head">
            <span className="eyebrow">Kitchen right now</span>
            <span className="live">
              <span className="live-dot" />
              Live
            </span>
          </div>
          <dl className="ticket-stats">
            <div>
              <dt>Orders in queue</dt>
              <dd>{data ? data.queue_length : "–"}</dd>
            </div>
            <div>
              <dt>Wait if you order now</dt>
              <dd>{data ? `${data.estimated_wait_minutes} min` : "–"}</dd>
            </div>
          </dl>
          <div className="tear" />
          <p className="eyebrow">Ready in three minutes or less</p>
          <ul className="price-list">
            {quick.map((item) => (
              <PriceLine key={item.item_id} label={item.item_name} amount={rupees(item.price)} />
            ))}
          </ul>
        </aside>
      </section>

      <section className="container band">
        <h2 className="section-title">How it works</h2>
        <ol className="steps-grid">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <span className="step-number">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container band split">
        <div>
          <h2 className="section-title">Built around a ten-minute break</h2>
          <p className="muted">
            Every item is tagged by how long the kitchen needs. Short on time? Stay on the left.
          </p>
        </div>
        <div className="tier-scale">
          {TIER_SCALE.map(([tier, range, weight]) => {
            const count = items.filter((i) => i.turnaround_tier === tier).length;
            return (
              <div key={tier} className="tier" style={{ flexGrow: weight }}>
                <span className={`tier-bar tier-${tier}`} />
                <strong>{TIERS[tier]}</strong>
                <span className="mono small muted">{range}</span>
                {count > 0 && <span className="small muted">{count} items on the menu</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="container band split">
        <h2 className="section-title">For the counter</h2>
        <div className="counter-copy">
          <p className="muted">
            A live board of tickets ordered by pickup time, stock that can't be oversold, and a report of every
            wait, down to the minute.
          </p>
          <Link to="/login" className="link">
            Staff sign in →
          </Link>
        </div>
      </section>

      <footer className="container footer">
        <span className="wordmark small-mark">
          Campus<em>Bite</em>
        </span>
        <span className="muted">Campus café pre-ordering · Pay at pickup</span>
      </footer>
    </>
  );
}

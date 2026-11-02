import { useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { Loading, Panel } from "../../components/ui";
import { useLive } from "../../useLive";

const loadStaff = () => api("/admin/staff");
const EMPTY = { full_name: "", email: "", password: "", role: "STAFF" };

export default function Staff() {
  const { user } = useAuth();
  const { data: team, refresh } = useLive(loadStaff, 60000);
  const [form, setForm] = useState(EMPTY);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");

  if (!team) return <Loading />;

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function add(event) {
    event.preventDefault();
    try {
      await api("/admin/staff", { method: "POST", body: form });
      setForm(EMPTY);
      setError("");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(userId) {
    await api(`/admin/staff/${userId}`, { method: "DELETE" });
    setRemoving(null);
    refresh();
  }

  return (
    <div className="panels">
      <Panel title="Team" note={`${team.length} people can use the kitchen board`}>
        <ul className="people">
          {team.map((person) => (
            <li key={person.user_id}>
              <div>
                <span>{person.full_name}</span>
                <span className="small muted">{person.email}</span>
              </div>
              <span className="pill">{person.user_role === "ADMIN" ? "Admin" : "Staff"}</span>
              {person.user_id === user.user_id ? (
                <span className="small muted">You</span>
              ) : removing === person.user_id ? (
                <span className="confirm">
                  <button className="link" onClick={() => setRemoving(null)}>
                    Keep
                  </button>
                  <button className="link danger" onClick={() => remove(person.user_id)}>
                    Remove
                  </button>
                </span>
              ) : (
                <button className="link quiet" onClick={() => setRemoving(person.user_id)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Add a team member">
        <form className="form" onSubmit={add}>
          <label>
            Full name
            <input value={form.full_name} onChange={update("full_name")} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={update("email")} required />
          </label>
          <label>
            Temporary password
            <input type="password" value={form.password} onChange={update("password")} minLength={8} required />
          </label>
          <label>
            Role
            <select value={form.role} onChange={update("role")}>
              <option value="STAFF">Kitchen staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          {error && <p className="error">{error}</p>}
          <button className="button">Add to team</button>
        </form>
      </Panel>
    </div>
  );
}

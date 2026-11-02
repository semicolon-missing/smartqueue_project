import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth";
import { Tabs } from "../components/ui";

const DEMO_ACCOUNTS = [
  ["Student", "aarav@smartqueue.local"],
  ["Kitchen staff", "ravi.staff@smartqueue.local"],
  ["Admin", "admin@smartqueue.local"],
];

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "STUDENT" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = isLogin ? { email: form.email, password: form.password } : form;
      const user = await signIn(isLogin ? "/auth/login" : "/auth/signup", body);
      navigate(location.state?.from ?? homeFor(user), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="container narrow auth">
      <h1>{isLogin ? "Welcome back" : "Create an account"}</h1>
      <Tabs value={mode} onChange={setMode} options={[["login", "Log in"], ["signup", "Sign up"]]} />

      <form className="form" onSubmit={submit}>
        {!isLogin && (
          <label>
            Full name
            <input value={form.full_name} onChange={update("full_name")} autoComplete="name" required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={form.email} onChange={update("email")} autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={update("password")}
            minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
          />
        </label>
        {!isLogin && (
          <label>
            I am
            <select value={form.role} onChange={update("role")}>
              <option value="STUDENT">A student</option>
              <option value="FACULTY">Faculty</option>
            </select>
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button className="button block" disabled={busy}>
          {isLogin ? "Log in" : "Create account"}
        </button>
      </form>

      {isLogin && (
        <div className="demo">
          <p className="eyebrow">Demo accounts · password123</p>
          {DEMO_ACCOUNTS.map(([label, email]) => (
            <button
              key={email}
              type="button"
              className="demo-row"
              onClick={() => setForm({ ...form, email, password: "password123" })}
            >
              <span>{label}</span>
              <span className="mono small muted">{email}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

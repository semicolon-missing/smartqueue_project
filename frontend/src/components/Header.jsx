import { Link, NavLink, useNavigate } from "react-router-dom";
import { CUSTOMER, useAuth } from "../auth";

function linksFor(user) {
  if (!user) return [["/menu", "Menu"]];
  if (CUSTOMER.includes(user.user_role)) return [["/menu", "Menu"], ["/orders", "My orders"]];
  if (user.user_role === "ADMIN") return [["/kitchen", "Kitchen"], ["/admin", "Admin"]];
  return [["/kitchen", "Kitchen"]];
}

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function logOut() {
    signOut();
    navigate("/");
  }

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link to="/" className="wordmark">
          Campus<em>Bite</em>
        </Link>
        <nav>
          {linksFor(user).map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/orders"}>
              {label}
            </NavLink>
          ))}
          {user ? (
            <button className="nav-button" onClick={logOut}>
              Log out
            </button>
          ) : (
            <Link to="/login" className="button small">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

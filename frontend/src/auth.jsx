import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, getToken, setToken } from "./api";

const AuthContext = createContext(null);

export const CUSTOMER = ["STUDENT", "FACULTY"];
export const STAFF = ["STAFF", "ADMIN"];

export function homeFor(user) {
  if (user.user_role === "ADMIN") return "/admin";
  if (user.user_role === "STAFF") return "/kitchen";
  return "/menu";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api("/auth/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  async function signIn(path, body) {
    const session = await api(path, { method: "POST", body });
    setToken(session.token);
    setUser(session.user);
    return session.user;
  }

  function signOut() {
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, ready, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function RequireRole({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!roles.includes(user.user_role)) return <Navigate to={homeFor(user)} replace />;
  return children;
}

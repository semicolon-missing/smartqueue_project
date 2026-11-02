const TOKEN_KEY = "smartqueue.token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function readError(data) {
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) return data.detail[0]?.msg ?? "Something went wrong";
  return "Something went wrong";
}

export async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body && JSON.stringify(body),
  });
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(readError(data));
  return data;
}

export async function download(path, filename) {
  const response = await fetch(`/api${path}`, { headers: authHeaders() });
  const url = URL.createObjectURL(await response.blob());
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

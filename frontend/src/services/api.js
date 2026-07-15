// Default to same-origin requests (relative URLs) so the Vite dev proxy
// forwards API/auth/upload calls to the Express backend without CORS hassle.
// Set VITE_API_URL in frontend/.env to bypass the proxy and hit a specific backend.
const API_BASE =
  import.meta.env.VITE_API_URL || "";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const AUTH_TOKEN_KEY = "lessoncraft-auth-token";

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function authHeaders(extra = {}) {
  const token = getAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function apiRequest(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

async function apiPost(path, payload, { signal } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

async function apiPut(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

async function apiDelete(path) {
  const response = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

async function apiUpload(path, formData) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || "Upload failed");
  return data;
}

export {
  API_BASE,
  GOOGLE_CLIENT_ID,
  AUTH_TOKEN_KEY,
  getAuthToken,
  authHeaders,
  apiRequest,
  apiPost,
  apiPut,
  apiDelete,
  apiUpload,
};

const BASE = "/api";

function getToken() {
  return localStorage.getItem("reflex_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  riders: () => request("/auth/riders"),

  createDelivery: (payload) => request("/deliveries", { method: "POST", body: payload }),
  listDeliveries: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/deliveries${qs ? `?${qs}` : ""}`);
  },
  getDelivery: (id) => request(`/deliveries/${id}`),
  getAudit: (id) => request(`/deliveries/${id}/audit`),
  assign: (id, riderId) => request(`/deliveries/${id}/assign`, { method: "POST", body: { riderId } }),
  setStatus: (id, status) => request(`/deliveries/${id}/status`, { method: "POST", body: { status } }),
  sendLocation: (id, latitude, longitude) =>
    request(`/deliveries/${id}/location`, { method: "POST", body: { latitude, longitude } }),
  syncBatch: (id, events) => request(`/deliveries/${id}/sync`, { method: "POST", body: { events } }),
  verify: (id, releaseCode) => request(`/deliveries/${id}/verify`, { method: "POST", body: { releaseCode } }),

  track: (trackingNumber) => request(`/track/${trackingNumber}`, { auth: false }),
  smsOutbox: () => request("/sms/outbox"),
};

export function saveSession({ user, token }) {
  localStorage.setItem("reflex_token", token);
  localStorage.setItem("reflex_user", JSON.stringify(user));
}

export function loadSession() {
  const token = localStorage.getItem("reflex_token");
  const userRaw = localStorage.getItem("reflex_user");
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("reflex_token");
  localStorage.removeItem("reflex_user");
}

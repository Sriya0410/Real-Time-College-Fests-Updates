const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const API = `${API_BASE}/api`;

// GET categories
export async function fetchCategories() {
  const res = await fetch(`${API}/categories`, { credentials: "include" });
  const json = await res.json();
  return json?.data ?? json;
}

// GET events
export async function fetchEvents(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/events${qs ? `?${qs}` : ""}`, { credentials: "include" });
  const json = await res.json();
  return json?.data ?? { upcoming: [], completed: [], all: [] };
}

// CREATE event (admin)
export async function createEvent(payload, token) {
  const res = await fetch(`${API}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Create event failed");
  return json?.data ?? json;
}

// UPDATE event (admin)
export async function updateEvent(id, payload, token) {
  const res = await fetch(`${API}/events/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Update event failed");
  return json?.data ?? json;
}

// PATCH status (admin)
export async function setEventStatus(id, status, token) {
  const res = await fetch(`${API}/events/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ status }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Status update failed");
  return json;
}
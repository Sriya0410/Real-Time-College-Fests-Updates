const API = "http://localhost:5000/api";

export async function fetchLiveUpdates(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/live-updates${qs ? `?${qs}` : ""}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Failed to load live updates");
  return json?.data ?? [];
}

export async function postLiveUpdate(payload) {
  const token = localStorage.getItem("admin_token"); // ✅ admin token (not student token)

  const res = await fetch(`${API}/live-updates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Failed to post live update");
  return json?.data ?? json;
}
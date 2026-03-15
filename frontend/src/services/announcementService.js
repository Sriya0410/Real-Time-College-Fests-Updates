import api from "./api";

// ✅ PUBLIC
export async function fetchAnnouncements() {
  const res = await api.get("/announcements?active=1");
  return res.data?.data || [];
}

// ✅ ADMIN
export async function postAnnouncement(payload) {
  const res = await api.post("/announcements", payload);
  if (!res.data?.ok) throw new Error(res.data?.message || "Failed");
  return res.data.data;
}

// ✅ ADMIN
export async function toggleAnnouncement(id) {
  const res = await api.patch(`/announcements/${id}/toggle`);
  if (!res.data?.ok) throw new Error(res.data?.message || "Failed");
  return res.data.data;
}
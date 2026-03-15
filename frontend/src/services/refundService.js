import api from "./api";

export async function fetchMyRefunds() {
  const res = await api.get("/refunds/my");
  // backend returns { ok:true, data:[...] }
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function fetchRefundReceipt(id) {
  if (!id) return null;
  const res = await api.get(`/refunds/${id}/receipt`);
  return res.data?.data || null;
}
import api from "./api";

export async function fetchVerifiedUpdates(params = {}) {
  const res = await api.get("/verified-updates", { params });
  return res.data?.data || [];
}

export async function postVerifiedUpdate(payload) {
  const res = await api.post("/verified-updates", payload);
  return res.data?.data;
}

export async function verifyUpdateCode(code) {
  const res = await api.get("/verified-updates/verify", { params: { code } });
  return res.data; // { ok, found, data }
}

export async function toggleVerifiedUpdate(id) {
  const res = await api.patch(`/verified-updates/${id}/toggle`);
  return res.data;
}
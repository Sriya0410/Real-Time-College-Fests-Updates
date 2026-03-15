import api from "./api";

export async function studentLogin(payload) {
  const res = await api.post("/auth/student/login", payload);
  return res.data;
}

export async function studentRegister(payload) {
  const res = await api.post("/auth/student/register", payload);
  return res.data;
}

export async function adminLogin(payload) {
  const res = await api.post("/auth/admin/login", payload);
  return res.data;
}
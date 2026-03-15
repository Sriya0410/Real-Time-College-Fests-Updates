import api from "./api";

export async function listAnalyticsEvents() {
  const res = await api.get("/analytics/events");
  return res.data?.data || [];
}

export async function getAttendanceSummary(eventId) {
  const res = await api.get(`/analytics/${eventId}/attendance/summary`);
  return res.data?.data || null;
}

export async function getRevenueSummary(eventId) {
  const res = await api.get(`/analytics/${eventId}/revenue`);
  return res.data?.data || null;
}

export async function listExpenses(eventId) {
  const res = await api.get(`/analytics/${eventId}/expenses`);
  return res.data?.data || { items: [], totalExpenses: 0 };
}

export async function addExpense(eventId, payload) {
  const res = await api.post(`/analytics/${eventId}/expenses`, payload);
  return res.data;
}
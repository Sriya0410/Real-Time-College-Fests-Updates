import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const method = String(config?.method || "get").toLowerCase();
  const url = String(config?.url || "");

  const adminToken = localStorage.getItem("admin_token");
  const studentToken = localStorage.getItem("token");

  const isAdminArea = url.startsWith("/admin") || url.includes("/admin/");
  const isAnalyticsArea = url.startsWith("/analytics") || url.includes("/analytics/");

  const isAdminAnnouncementsAction =
    url.startsWith("/announcements") &&
    ["post", "patch", "delete"].includes(method);

  const isAdminVerifiedUpdatesAction =
    url.startsWith("/verified-updates") &&
    ["post", "patch", "delete"].includes(method);

  const isAdminCheckinAction =
    url === "/registrations/checkin" ||
    url.startsWith("/registrations/checkin") ||
    url.includes("/registrations/checkin");

  let finalToken = null;

  if (
    isAdminArea ||
    isAnalyticsArea ||
    isAdminAnnouncementsAction ||
    isAdminVerifiedUpdatesAction ||
    isAdminCheckinAction
  ) {
    finalToken = adminToken;
  } else {
    finalToken = studentToken || adminToken;
  }

  if (finalToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${finalToken}`;
  }

  return config;
});

export default api;
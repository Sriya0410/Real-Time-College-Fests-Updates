export function fileUrl(url) {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  // axios base (usually ends with /api)
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // remove trailing /api
  const serverBase = apiBase.replace(/\/api\/?$/, "");

  // return full path
  return `${serverBase}${url.startsWith("/") ? url : `/${url}`}`;
}
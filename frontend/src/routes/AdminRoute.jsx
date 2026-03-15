import { Navigate } from "react-router-dom";

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export default function AdminRoute({ children }) {
  const token = localStorage.getItem("admin_token");

  if (!token) return <Navigate to="/admin/login" replace />;

  const decoded = parseJwt(token);
  const role = decoded?.role ?? decoded?.user_role ?? decoded?.type ?? null;

  const allowedRoles = ["ADMIN", "STUDENT_AFFAIRS", "VOLUNTEER"];

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
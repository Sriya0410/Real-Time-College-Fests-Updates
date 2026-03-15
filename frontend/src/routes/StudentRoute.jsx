import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function StudentRoute({ children }) {
  const { user } = useAuth();
  const loc = useLocation();

  // ✅ if not logged in -> go to student login
  if (!user) {
    return <Navigate to="/student/login" replace state={{ from: loc.pathname }} />;
  }

  // ✅ optional role check (safe)
  if (user.role && String(user.role).toUpperCase() !== "STUDENT") {
    return <Navigate to="/" replace />;
  }

  return children;
}
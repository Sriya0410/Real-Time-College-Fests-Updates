import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/eventverse.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { resetStudentPassword, resetAdminPassword } = useAuth();

  const role = String(params.get("role") || "student").toLowerCase();
  const isAdmin = role === "admin";
  const token = String(params.get("token") || "");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!token) {
      setErr("Reset token missing.");
      return;
    }

    try {
      setLoading(true);

      if (isAdmin) {
        await resetAdminPassword({ token, password, confirmPassword });
      } else {
        await resetStudentPassword({ token, password, confirmPassword });
      }

      setMsg("Password updated successfully. Redirecting to login...");

      setTimeout(() => {
        navigate(isAdmin ? "/admin/login" : "/student/login", { replace: true });
      }, 1500);
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ev-bg">
      <div className="ev-shell">
        <button
          className="ev-topBack"
          onClick={() => navigate(isAdmin ? "/admin/login" : "/student/login")}
        >
          ← Back
        </button>

        <h2 className="ev-titleTop">{isAdmin ? "Admin" : "Student"}</h2>
        <h1 className="ev-titleBig pink">Reset Password</h1>
        <div className="ev-neonLine" />

        {err && <div className="ev-error">{err}</div>}
        {msg && <div className="ev-successBox">{msg}</div>}

        <form className="ev-form" onSubmit={submit}>
          <label className="ev-label">
            New Password
            <div className="ev-passRow">
              <input
                className="ev-input"
                placeholder="Enter new password"
                type={show1 ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="ev-eye" onClick={() => setShow1((s) => !s)}>
                {show1 ? "🙈" : "👁"}
              </button>
            </div>
          </label>

          <label className="ev-label" style={{ marginTop: 14 }}>
            Confirm Password
            <div className="ev-passRow">
              <input
                className="ev-input"
                placeholder="Re-enter password"
                type={show2 ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button type="button" className="ev-eye" onClick={() => setShow2((s) => !s)}>
                {show2 ? "🙈" : "👁"}
              </button>
            </div>
          </label>

          <button className="ev-primaryBtn" type="submit" disabled={loading}>
            {loading ? "Updating..." : "→ Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
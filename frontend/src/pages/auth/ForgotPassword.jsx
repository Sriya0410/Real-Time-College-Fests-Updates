import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/eventverse.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { forgotStudentPassword, forgotAdminPassword } = useAuth();

  const role = String(params.get("role") || "student").toLowerCase();
  const isAdmin = role === "admin";

  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    try {
      setLoading(true);

      const res = isAdmin
        ? await forgotAdminPassword(email.trim().toLowerCase())
        : await forgotStudentPassword(email.trim().toLowerCase());

      const resetToken = res?.resetToken;
      if (!resetToken) {
        throw new Error("Reset token not received");
      }

      setMsg("Email verified. Redirecting to reset password...");

      setTimeout(() => {
        navigate(
          `/reset-password?role=${isAdmin ? "admin" : "student"}&token=${encodeURIComponent(
            resetToken
          )}`,
          { replace: true }
        );
      }, 1000);
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Request failed");
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
        <h1 className="ev-titleBig pink">Forgot Password</h1>
        <div className="ev-neonLine" />

        {err && <div className="ev-error">{err}</div>}
        {msg && <div className="ev-successBox">{msg}</div>}

        <form className="ev-form" onSubmit={submit}>
          <label className="ev-label">
            Email Address
            <input
              type="email"
              className="ev-input"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <button className="ev-primaryBtn" type="submit" disabled={loading}>
            {loading ? "Checking..." : "→ Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
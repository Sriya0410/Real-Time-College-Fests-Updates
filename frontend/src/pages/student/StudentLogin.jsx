import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/eventverse.css";

export default function StudentLogin() {
  const { loginStudent } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      setLoading(true);

      // ✅ optional: clear old student session only
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      const u = await loginStudent(cleanEmail, cleanPassword);

      const role = String(u?.role || "").toUpperCase();
      if (role !== "STUDENT") {
        return setErr("This account is not a student.");
      }

      navigate("/student/home", { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ev-bg">
      <div className="ev-shell">
        <button className="ev-topBack" onClick={() => navigate("/student/access")}>
          ← Back
        </button>

        <h2 className="ev-titleTop">Student</h2>
        <h1 className="ev-titleBig pink">Login</h1>
        <div className="ev-neonLine" />

        {err && <div className="ev-error">{err}</div>}

        <form className="ev-form" onSubmit={submit}>
          <label className="ev-label">
            Email Address
            <input
              type="email"
              className="ev-input"
              placeholder="enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="ev-label" style={{ marginTop: 14 }}>
            Password
            <div className="ev-passRow">
              <input
                className="ev-input"
                placeholder="enter your password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="button" className="ev-eye" onClick={() => setShow((s) => !s)}>
                👁
              </button>
            </div>
          </label>

          <button className="ev-primaryBtn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "→ Login as Student"}
          </button>

          <div style={{ marginTop: 18, textAlign: "center", color: "rgba(255,255,255,.55)" }}>
            New student?
          </div>

          <button type="button" className="ev-linkBtn" onClick={() => navigate("/student/signup")}>
            Create account →
          </button>
        </form>
      </div>
    </div>
  );
}
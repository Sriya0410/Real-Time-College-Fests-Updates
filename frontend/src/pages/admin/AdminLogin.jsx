import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/eventverse.css";

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [rolePick, setRolePick] = useState("ADMIN");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!email || !password) {
      setErr("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const { token, user } = await loginAdmin(
        email.trim().toLowerCase(),
        password
      );

      const role = String(user?.role || "").toUpperCase();
      const allowedRoles = ["ADMIN", "STUDENT_AFFAIRS", "VOLUNTEER"];

      if (!allowedRoles.includes(role)) {
        setErr("This account is not authorized for admin access.");
        return;
      }

      if (role !== rolePick) {
        setErr(`Your account role is ${role}. Please select ${role}.`);
        return;
      }

      if (token) {
        localStorage.setItem("admin_token", token);
      }

      const from = location.state?.from?.pathname;
      navigate(from || "/admin/dashboard", { replace: true });
    } catch (e2) {
      setErr(
        e2?.response?.data?.message ||
          e2?.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ev-bg">
      <div className="ev-shell">
        <button
          className="ev-topBack"
          onClick={() => navigate("/", { replace: true })}
        >
          ← Back to Home
        </button>

        <h2 className="ev-titleTop">Admin</h2>
        <h1 className="ev-titleBig">Login</h1>
        <div className="ev-neonLine" />

        {err && <div className="ev-error">{err}</div>}

        <form className="ev-form" onSubmit={submit}>
          <label className="ev-label">
            Admin Email
            <input
              className="ev-input"
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="ev-label" style={{ marginTop: 14 }}>
            Login As
            <div className="ev-selectWrap">
              <select
                className="ev-select ev-select-dark"
                value={rolePick}
                onChange={(e) => setRolePick(e.target.value)}
              >
                <option value="ADMIN">Administrator</option>
                <option value="STUDENT_AFFAIRS">Student Affairs</option>
                <option value="VOLUNTEER">Volunteer</option>
              </select>
              <span className="ev-selectIcon">▼</span>
            </div>
          </label>

          <label className="ev-label" style={{ marginTop: 14 }}>
            Password
            <div className="ev-passRow">
              <input
                className="ev-input"
                placeholder="Enter password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <button
                type="button"
                className="ev-eye"
                onClick={() => setShow(!show)}
                aria-label="Toggle password visibility"
              >
                {show ? "🙈" : "👁"}
              </button>
            </div>
          </label>

          <div className="ev-forgotRow">
            <button
              type="button"
              className="ev-forgotBtn"
              onClick={() => navigate("/forgot-password?role=admin")}
            >
              Forgot Password?
            </button>
          </div>

          <button className="ev-primaryBtn" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "→ Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
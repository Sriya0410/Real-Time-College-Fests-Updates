import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/eventverse.css";

export default function StudentSignup() {
  const { registerStudent } = useAuth();
  const navigate = useNavigate();

  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    reg_no: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!form.full_name.trim()) {
      return setErr("Full name is required.");
    }

    if (!form.email.trim()) {
      return setErr("Email is required.");
    }

    if (form.phone && !/^\d{10}$/.test(form.phone.trim())) {
      return setErr("Enter a valid 10-digit mobile number.");
    }

    if (form.password.length < 4) {
      return setErr("Password is too short (use at least 4 characters).");
    }

    if (form.password !== form.confirm) {
      return setErr("Passwords do not match.");
    }

    const payload = {
      full_name: form.full_name.trim(),
      reg_no: form.reg_no.trim() || null,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      password: form.password,
    };

    try {
      setLoading(true);

      const res = await registerStudent(payload);
      console.log("Signup success:", res);

      setShowSuccess(true);

      setTimeout(() => {
        navigate("/student/login", { replace: true });
      }, 1800);
    } catch (e2) {
      console.log("Signup error full:", e2);
      console.log("Signup error response:", e2?.response?.data);

      setErr(
        e2?.response?.data?.message ||
          e2?.response?.data?.error ||
          e2?.message ||
          "Signup failed"
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
          onClick={() => navigate("/student/access")}
        >
          ← Back
        </button>

        <h2 className="ev-titleTop">Student</h2>
        <h1 className="ev-titleBig pink">Signup</h1>
        <div className="ev-neonLine" />
        

        {err && <div className="ev-error">{err}</div>}

        <form className="ev-form" onSubmit={submit}>
          <div className="ev-grid2">
            <label className="ev-label">
              Full Name
              <input
                className="ev-input"
                placeholder="Enter your full name"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                required
              />
            </label>

            <label className="ev-label">
              Registration No.
              <input
                className="ev-input"
                placeholder="E.g., 231FA07010"
                value={form.reg_no}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reg_no: e.target.value }))
                }
              />
            </label>

            <label className="ev-label">
              Email Address
              <input
                type="email"
                className="ev-input"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </label>

            <label className="ev-label">
              Mobile Number
              <input
                type="tel"
                className="ev-input"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </label>

            <label className="ev-label">
              Password
              <div className="ev-passRow">
                <input
                  className="ev-input"
                  placeholder="At least 4 characters"
                  type={show1 ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required
                />
                <button
                  type="button"
                  className="ev-eye"
                  onClick={() => setShow1((s) => !s)}
                >
                  {show1 ? "🙈" : "👁"}
                </button>
              </div>
            </label>

            <label className="ev-label">
              Confirm Password
              <div className="ev-passRow">
                <input
                  className="ev-input"
                  placeholder="Re-enter password"
                  type={show2 ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, confirm: e.target.value }))
                  }
                  required
                />
                <button
                  type="button"
                  className="ev-eye"
                  onClick={() => setShow2((s) => !s)}
                >
                  {show2 ? "🙈" : "👁"}
                </button>
              </div>
            </label>
          </div>

          <button className="ev-primaryBtn" type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "→ Create Account"}
          </button>

          <div style={{ marginTop: 14, textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,.65)", fontWeight: 800 }}>
              Already have an account?
            </div>

            <button
              type="button"
              className="ev-linkBtn"
              onClick={() => navigate("/student/login")}
            >
              Sign In Now →
            </button>
          </div>
        </form>

        {showSuccess && (
          <div className="ev-modalOverlay">
            <div className="ev-modalCard">
              <div className="ev-successIcon">✓</div>
              <h2 className="ev-modalTitle">Registration Successful</h2>
              <p className="ev-modalText">
                Your student account has been created successfully.
              </p>
              <p className="ev-modalSubText">Redirecting to login page...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
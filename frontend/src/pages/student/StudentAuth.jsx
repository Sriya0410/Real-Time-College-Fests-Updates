import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/auth.css";

export default function StudentAuth() {
  const { login, registerStudent } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | signup
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    try {
      let u;
      if (mode === "signup") {
        u = await registerStudent(form);
      } else {
        u = await login(form.email, form.password);
      }

      if (u.role !== "STUDENT") {
        setErr("This is not a student account.");
        return;
      }

      navigate("/student/home");
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="authWrap">
      <form className="card authCard" onSubmit={onSubmit}>
        <h1>Student {mode === "signup" ? "Signup" : "Login"}</h1>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className={`btn ${mode === "login" ? "" : "btnGhost"}`}
            onClick={() => setMode("login")}
          >
            Existing Student
          </button>
          <button
            type="button"
            className={`btn ${mode === "signup" ? "" : "btnGhost"}`}
            onClick={() => setMode("signup")}
          >
            New Student
          </button>
        </div>

        {err && <div className="card">{err}</div>}

        {mode === "signup" && (
          <>
            <label>
              Username / Full Name
              <input
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </label>

            <label>
              Phone (optional)
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
          </>
        )}

        <label>
          Email
          <input
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
        </label>

        <button className="btn" type="submit">
          {mode === "signup" ? "Create Account" : "Login"}
        </button>
      </form>
    </div>
  );
}
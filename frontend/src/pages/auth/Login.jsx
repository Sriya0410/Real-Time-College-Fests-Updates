import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "../../styles/auth.css";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@fest.com");
  const [password, setPassword] = useState("admin123");

  const onSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
    alert("Logged in ✅");
    window.location.href = "/";
  };

  return (
    <div className="authWrap">
      <form className="card authCard" onSubmit={onSubmit}>
        <h1>Login</h1>
        <p className="muted">Use admin credentials after inserting seed users.</p>

        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        <button className="btn" type="submit">Login</button>
      </form>
    </div>
  );
}
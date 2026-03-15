import { useNavigate } from "react-router-dom";
import "../styles/eventverse.css";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="ev-bg">
      <div className="ev-shell">
        <h2 className="ev-titleTop">Welcome to</h2>
        <h1 className="ev-titleBig">EventVerse</h1>
        <div className="ev-neonLine" />

        <button className="ev-btnCard" onClick={() => navigate("/admin/login")}>
          <div className="left">
            <div className="ev-icon">🛡️</div>
            <div>
              <h3>Admin Login</h3>
              <p>Manage & Control</p>
            </div>
          </div>
          <div className="ev-arrow">→</div>
        </button>

        <div className="ev-orRow">
          <div className="ev-orPill">OR</div>
        </div>

        <button className="ev-btnCard blue" onClick={() => navigate("/student/access")}>
          <div className="left">
            <div className="ev-icon">🎓</div>
            <div>
              <h3>Student Access</h3>
              <p>Discover & Participate</p>
            </div>
          </div>
          <div className="ev-arrow">→</div>
        </button>
      </div>
    </div>
  );
}
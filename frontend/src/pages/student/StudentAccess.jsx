import { useNavigate } from "react-router-dom";
import "../../styles/eventverse.css";

export default function StudentAccess() {
  const navigate = useNavigate();

  return (
    <div className="ev-bg">
      <div className="ev-shell">
        <button className="ev-topBack" onClick={() => navigate("/")}>← Back to Home</button>

        <h1 className="ev-titleBig">Student</h1>
        <h1 className="ev-titleBig">Access</h1>
        <div className="ev-neonLine" />

        <button className="ev-btnCard" onClick={() => navigate("/student/login")}>
          <div className="left">
            <div className="ev-icon">👤</div>
            <div>
              <h3>Existing Student</h3>
              <p>Login to your account</p>
            </div>
          </div>
          <div className="ev-arrow">→</div>
        </button>

        <div className="ev-orRow">
          <div className="ev-orPill">OR</div>
        </div>

        <button className="ev-btnCard blue" onClick={() => navigate("/student/signup")}>
          <div className="left">
            <div className="ev-icon">🎓</div>
            <div>
              <h3>New Student</h3>
              <p>Create new account</p>
            </div>
          </div>
          <div className="ev-arrow">→</div>
        </button>
      </div>
    </div>
  );
}
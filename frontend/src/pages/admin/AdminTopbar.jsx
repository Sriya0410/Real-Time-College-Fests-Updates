import { useAuth } from "../../context/AuthContext";
import "../../styles/adminLayout.css";

export default function AdminTopbar({ onMenu }) {
  const { adminUser } = useAuth();

  const isVolunteer = adminUser?.role === "VOLUNTEER";
  const isSA = adminUser?.role === "STUDENT_AFFAIRS";

  const roleLabel = isVolunteer
    ? "Volunteer"
    : isSA
    ? "Student Affairs"
    : "Administrator";

  const panelTitle = isVolunteer ? "Volunteer Panel" : "Admin Panel";

  const displayName =
    adminUser?.full_name ||
    adminUser?.name ||
    adminUser?.email ||
    (isVolunteer ? "Volunteer" : "Admin");

  return (
    <header className="adminTopbar">
      <button
        className="adminMenuBtn"
        onClick={onMenu}
        aria-label="Open menu"
      >
        ☰
      </button>

      <div className="adminTopbarTitle">
        <div className="adminTopbarBrand">
          <span>{panelTitle}</span>
        </div>
        <div className="adminTopbarSub">{roleLabel}</div>
      </div>

      <div className="adminTopbarRight">
        <div className="adminUserPill">
          <span className="adminUserName">{displayName}</span>
        </div>
      </div>
    </header>
  );
}
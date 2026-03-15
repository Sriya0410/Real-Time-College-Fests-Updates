import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/adminLayout.css";

export default function AdminSidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { adminUser, logout } = useAuth();

  const doLogout = () => {
    logout();
    onClose?.();
    navigate("/", { replace: true });
  };

  const navClass = ({ isActive }) => `adminNavItem ${isActive ? "active" : ""}`;

  const isSA = adminUser?.role === "STUDENT_AFFAIRS";
  const isVolunteer = adminUser?.role === "VOLUNTEER";

  return (
    <>
      <aside className={`adminSidebar ${open ? "open" : ""}`}>
        <div className="adminSidebarHeader">
          <div className="adminSidebarBrand">
            <span className="adminDot" />
            <span>
              {isVolunteer ? "Volunteer" : isSA ? "Student Affairs" : "Admin"}
            </span>
          </div>

          <button className="adminCloseBtn" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <nav className="adminSidebarNav">
          {isVolunteer ? (
            <>
              <NavLink to="/admin/checkin" className={navClass} onClick={onClose}>
                QR Check-In
              </NavLink>
            </>
          ) : (
            <>
              <div className="adminSectionLabel">Main</div>

              <NavLink to="/admin/dashboard" className={navClass} onClick={onClose}>
                Dashboard
              </NavLink>

              <NavLink to="/admin/analytics" className={navClass} onClick={onClose}>
                Analytics
              </NavLink>

              <NavLink to="/admin/checkin" className={navClass} onClick={onClose}>
                QR Check-In
              </NavLink>

              <div className="adminDivider" />
              <div className="adminSectionLabel">Events</div>

              <NavLink to="/admin/events/create" className={navClass} onClick={onClose}>
                Create Event
              </NavLink>

              <NavLink to="/admin/events/manage" className={navClass} onClick={onClose}>
                Manage Events
              </NavLink>

              <div className="adminDivider" />
              <div className="adminSectionLabel">Updates</div>

              <NavLink to="/admin/announcements" className={navClass} onClick={onClose}>
                Announcements
              </NavLink>

              <NavLink to="/admin/live-updates" className={navClass} onClick={onClose}>
                Live Updates
              </NavLink>

              <NavLink to="/admin/verified-updates" className={navClass} onClick={onClose}>
                Verified Updates
              </NavLink>

              <div className="adminDivider" />
              <div className="adminSectionLabel">Registrations</div>

              <NavLink to="/admin/registrations" className={navClass} onClick={onClose}>
                Registrations
              </NavLink>

              <div className="adminDivider" />
              <div className="adminSectionLabel">Orders</div>

              <NavLink to="/admin/orders" className={navClass} onClick={onClose}>
                Food Orders
              </NavLink>

              <div className="adminDivider" />
              <div className="adminSectionLabel">Lost & Found</div>

              <NavLink to="/admin/lostfound" className={navClass} onClick={onClose}>
                Lost & Found
              </NavLink>
            </>
          )}

          <button type="button" className="adminLogoutBtn" onClick={doLogout}>
            Logout
          </button>
        </nav>
      </aside>

      <div className={`adminBackdrop ${open ? "show" : ""}`} onClick={onClose} />
    </>
  );
}
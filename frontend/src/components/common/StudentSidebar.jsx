import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/studentLayout.css";

export default function StudentSidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const doLogout = () => {
    logout();
    onClose?.();
    navigate("/", { replace: true });
  };

  const navClass = ({ isActive }) => `navItem ${isActive ? "active" : ""}`;

  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebarHeader">
          <div className="sidebarBrand">
            <div className="brandDot" />
            <span>Student</span>
          </div>

          <button className="closeBtn" onClick={onClose}>
            ✕
          </button>
        </div>

        <nav className="sidebarNav">
          <div className="navSectionLabel">Main</div>

          <NavLink to="/student/home" className={navClass} onClick={onClose}>
            Home
          </NavLink>

          <NavLink to="/student/events" className={navClass} onClick={onClose}>
            Events
          </NavLink>

          <NavLink to="/student/completed-events" className={navClass} onClick={onClose}>
            Completed Events
          </NavLink>

          <NavLink to="/student/campus-map" className={navClass} onClick={onClose}>
            Campus Map
          </NavLink>

          <div className="navDivider" />
          <div className="navSectionLabel">Updates</div>

          <NavLink to="/student/updates/announcements" className={navClass} onClick={onClose}>
            Announcements
          </NavLink>

          <NavLink to="/student/updates/live" className={navClass} onClick={onClose}>
            Live Updates
          </NavLink>

          <NavLink to="/student/verified-updates" className={navClass} onClick={onClose}>
            Verified Updates
          </NavLink>

          <NavLink to="/student/verify-update" className={navClass} onClick={onClose}>
            Verify Code
          </NavLink>

          <div className="navDivider" />
          <div className="navSectionLabel">Registrations</div>

          <NavLink to="/student/registrations" className={navClass} onClick={onClose}>
            My Registrations
          </NavLink>

          {/* ✅ NEW */}
          <NavLink to="/student/certificates" className={navClass} onClick={onClose}>
            Digital Certificates
          </NavLink>

          <div className="navDivider" />
          <div className="navSectionLabel">Food</div>

          <NavLink to="/student/food-stalls" className={navClass} onClick={onClose}>
            Food Stalls
          </NavLink>

          <NavLink to="/student/food/orders" className={navClass} onClick={onClose}>
            My Food Orders
          </NavLink>

          <div className="navDivider" />
          <div className="navSectionLabel">Lost &amp; Found</div>

          <NavLink to="/student/lostfound" className={navClass} onClick={onClose}>
            Lost &amp; Found
          </NavLink>

          <NavLink to="/student/lostfound/report" className={navClass} onClick={onClose}>
            Report Lost Item
          </NavLink>

          <NavLink to="/student/lostfound/receipts" className={navClass} onClick={onClose}>
            My Lost &amp; Found Receipts
          </NavLink>

          <div className="navDivider" />
          <div className="navSectionLabel">Payments</div>

          <NavLink to="/student/payments" className={navClass} onClick={onClose}>
            Payment History
          </NavLink>

          <NavLink to="/student/refunds" className={navClass} onClick={onClose}>
            Refund History
          </NavLink>

          <div className="navDivider" />
          <div className="navSectionLabel">Profile</div>

          <NavLink to="/student/profile" className={navClass} onClick={onClose}>
            Profile
          </NavLink>

          <button type="button" className="sidebarLogout" onClick={doLogout}>
            Logout
          </button>
        </nav>
      </aside>

      <div className={`backdrop ${open ? "show" : ""}`} onClick={onClose} />
    </>
  );
}
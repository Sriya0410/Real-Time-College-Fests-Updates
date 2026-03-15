import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import StudentTopbar from "../../components/common/StudentTopbar";
import StudentSidebar from "../../components/common/StudentSidebar";
import "../../styles/studentLayout.css";

export default function StudentLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="studentShell studentShellLayout">
      <header className="studentTopbarWrap">
        <StudentTopbar
          onMenuClick={() => setOpen(true)}
          title="EventVerse"
          username={user?.full_name || "Student"}
        />
      </header>

      <StudentSidebar open={open} onClose={() => setOpen(false)} />

      <main className={`studentPageBody ${open ? "sidebarOpen" : ""}`}>
        <Outlet />
      </main>
    </div>
  );
}
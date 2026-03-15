import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import "../../styles/adminLayout.css";

export default function AdminLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="adminApp">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />

      <div className="adminMain">
        <AdminTopbar onMenu={() => setOpen(true)} />

        <div className="adminContent">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
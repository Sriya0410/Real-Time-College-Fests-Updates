import { Routes, Route, Navigate } from "react-router-dom";

import Landing from "../pages/Landing";

/* ================= ADMIN ================= */
import AdminLogin from "../pages/admin/AdminLogin";
import AdminLayout from "../pages/admin/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminCreateEvent from "../pages/admin/AdminCreateEvent";
import AdminManageEvents from "../pages/admin/AdminManageEvents";
import AdminAnnouncements from "../pages/admin/AdminAnnouncements";
import AdminLiveUpdates from "../pages/admin/AdminLiveUpdates";
import AdminRegistrations from "../pages/admin/AdminRegistrations";
import AdminFoodOrders from "../pages/admin/AdminFoodOrders";
import AdminLostFound from "../pages/admin/AdminLostFound";
import AdminVerifiedUpdates from "../pages/admin/AdminVerifiedUpdates";
import AdminAnalytics from "../pages/admin/AdminAnalytics";
import AdminCheckin from "../pages/admin/AdminCheckin";

/* ================= STUDENT AUTH ================= */
import StudentAccess from "../pages/student/StudentAccess";
import StudentLogin from "../pages/student/StudentLogin";
import StudentSignup from "../pages/student/StudentSignup";

/* ================= STUDENT LAYOUT ================= */
import StudentLayout from "../pages/student/StudentLayout";
import StudentHome from "../pages/student/StudentHome";
import StudentEvents from "../pages/student/StudentEvents";
import StudentCompletedEvents from "../pages/student/StudentCompletedEvents";

/* ================= STUDENT UPDATES ================= */
import StudentAnnouncements from "../pages/student/StudentAnnouncements";
import StudentLiveUpdates from "../pages/student/StudentLiveUpdates";
import StudentVerifiedUpdates from "../pages/student/StudentVerifiedUpdates";
import VerifyUpdate from "../pages/student/VerifyUpdate";

/* ================= STUDENT EXTRA ================= */
import StudentRegistrations from "../pages/student/StudentRegistrations";
import StudentFoodStalls from "../pages/student/StudentFoodStalls";
import FoodReceipt from "../pages/student/FoodReceipt";
import StudentMyFoodOrders from "../pages/student/StudentMyFoodOrders";
import StudentLostFound from "../pages/student/StudentLostFound";
import LostFoundReceipt from "../pages/student/LostFoundReceipt";
import StudentReportLostItem from "../pages/student/StudentReportLostItem";
import StudentLostFoundReceipts from "../pages/student/StudentLostFoundReceipts";
import StudentPayments from "../pages/student/StudentPayments";
import StudentRefunds from "../pages/student/StudentRefunds";
import RefundReceipt from "../pages/student/RefundReceipt";
import StudentProfile from "../pages/student/StudentProfile";
import StudentTicket from "../pages/student/StudentTicket";
import VerifyTicket from "../pages/student/VerifyTicket";
import CampusMap from "../pages/student/CampusMap";
import StudentCertificates from "../pages/student/StudentCertificates"; // ✅ NEW

/* ================= ROUTE GUARDS ================= */
import AdminRoute from "./AdminRoute";
import StudentRoute from "./StudentRoute";

function getAdminRole() {
  try {
    const token = localStorage.getItem("admin_token");
    if (!token) return null;

    const decoded = JSON.parse(atob(token.split(".")[1]));
    return decoded?.role ?? decoded?.user_role ?? decoded?.type ?? null;
  } catch {
    return null;
  }
}

function AdminOnlyRoute({ children }) {
  const role = getAdminRole();

  if (role === "VOLUNTEER") {
    return <Navigate to="/admin/checkin" replace />;
  }

  return children;
}

function AdminDefaultRedirect() {
  const role = getAdminRole();
  return (
    <Navigate
      to={role === "VOLUNTEER" ? "/admin/checkin" : "/admin/dashboard"}
      replace
    />
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* LANDING */}
      <Route path="/" element={<Landing />} />

      {/* ADMIN LOGIN */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* ADMIN PROTECTED */}
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDefaultRedirect />} />

        <Route
          path="dashboard"
          element={
            <AdminOnlyRoute>
              <AdminDashboard />
            </AdminOnlyRoute>
          }
        />

        <Route
          path="analytics"
          element={
            <AdminOnlyRoute>
              <AdminAnalytics />
            </AdminOnlyRoute>
          }
        />

        <Route path="checkin" element={<AdminCheckin />} />

        <Route
          path="events/create"
          element={
            <AdminOnlyRoute>
              <AdminCreateEvent />
            </AdminOnlyRoute>
          }
        />

        <Route
          path="events/manage"
          element={
            <AdminOnlyRoute>
              <AdminManageEvents />
            </AdminOnlyRoute>
          }
        />

        <Route
          path="announcements"
          element={
            <AdminOnlyRoute>
              <AdminAnnouncements />
            </AdminOnlyRoute>
          }
        />

        <Route
          path="live-updates"
          element={
            <AdminOnlyRoute>
              <AdminLiveUpdates />
            </AdminOnlyRoute>
          }
        />

        <Route
          path="verified-updates"
          element={
            <AdminOnlyRoute>
              <AdminVerifiedUpdates />
            </AdminOnlyRoute>
          }
        />

        <Route
          path="registrations"
          element={
            <AdminOnlyRoute>
              <AdminRegistrations />
            </AdminOnlyRoute>
          }
        />

        <Route
          path="orders"
          element={
            <AdminOnlyRoute>
              <AdminFoodOrders />
            </AdminOnlyRoute>
          }
        />

        <Route
          path="lostfound"
          element={
            <AdminOnlyRoute>
              <AdminLostFound />
            </AdminOnlyRoute>
          }
        />

        <Route
          path="lostfound/receipt/:id"
          element={
            <AdminOnlyRoute>
              <LostFoundReceipt />
            </AdminOnlyRoute>
          }
        />

        <Route path="*" element={<AdminDefaultRedirect />} />
      </Route>

      {/* STUDENT AUTH */}
      <Route path="/student/access" element={<StudentAccess />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student/signup" element={<StudentSignup />} />

      {/* STUDENT PROTECTED */}
      <Route
        path="/student/*"
        element={
          <StudentRoute>
            <StudentLayout />
          </StudentRoute>
        }
      >
        <Route index element={<Navigate to="home" replace />} />

        <Route path="home" element={<StudentHome />} />
        <Route path="events" element={<StudentEvents />} />
        <Route path="completed-events" element={<StudentCompletedEvents />} />
        <Route path="campus-map" element={<CampusMap />} />

        <Route path="updates" element={<Navigate to="updates/announcements" replace />} />
        <Route path="updates/announcements" element={<StudentAnnouncements />} />
        <Route path="updates/live" element={<StudentLiveUpdates />} />

        <Route path="verified-updates" element={<StudentVerifiedUpdates />} />
        <Route path="verify-update" element={<VerifyUpdate />} />
        <Route path="verify-ticket" element={<VerifyTicket />} />

        <Route path="registrations" element={<StudentRegistrations />} />
        <Route path="certificates" element={<StudentCertificates />} /> {/* ✅ NEW */}
        <Route path="ticket/:registrationId" element={<StudentTicket />} />

        <Route path="food-stalls" element={<StudentFoodStalls />} />
        <Route path="food/orders" element={<StudentMyFoodOrders />} />
        <Route path="food/receipt/:id" element={<FoodReceipt />} />

        <Route path="lostfound" element={<StudentLostFound />} />
        <Route path="lostfound/report" element={<StudentReportLostItem />} />
        <Route path="lostfound/receipts" element={<StudentLostFoundReceipts />} />
        <Route path="lostfound/receipt/:id" element={<LostFoundReceipt />} />

        <Route path="payments" element={<StudentPayments />} />

        <Route path="refunds" element={<StudentRefunds />} />
        <Route path="refunds/receipt/:id" element={<RefundReceipt />} />
        <Route path="payments/refunds" element={<Navigate to="/student/refunds" replace />} />

        <Route path="profile" element={<StudentProfile />} />

        <Route path="*" element={<Navigate to="home" replace />} />
      </Route>

      {/* GLOBAL FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
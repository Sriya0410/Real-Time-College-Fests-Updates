import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "../../styles/adminOrdersPage.css";

export default function AdminFoodOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [paid, setPaid] = useState("ALL");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setErr("");
    setLoading(true);

    try {
      const adminToken = localStorage.getItem("admin_token");
      if (!adminToken) {
        throw new Error("Admin token missing. Please login again as ADMIN.");
      }

      const res = await api.get("/admin/orders");
      setOrders(res.data?.data || []);
    } catch (e) {
      const code = e?.response?.status;

      if (code === 401) {
        setErr("Unauthorized (401). Please login again as ADMIN.");
      } else if (code === 403) {
        setErr("Forbidden (403). Your token is not ADMIN. Login using Admin Login.");
      } else {
        setErr(e?.response?.data?.message || e?.message || "Failed to load orders");
      }

      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async (orderId) => {
    setErr("");
    try {
      await api.patch(`/admin/orders/${orderId}/paid`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, is_paid: 1 } : o))
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to mark paid");
    }
  };

  const updateStatus = async (orderId, nextStatus) => {
    setErr("");
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status: nextStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to update status");
    }
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return orders.filter((o) => {
      const matchQ =
        !qq ||
        String(o.id).includes(qq) ||
        String(o.user_id || "").includes(qq) ||
        String(o.stall_id || "").includes(qq) ||
        String(o.stall_name || "").toLowerCase().includes(qq) ||
        String(o.user_name || o.student_name || "").toLowerCase().includes(qq);

      const matchStatus =
        status === "ALL" || String(o.status || "").toUpperCase() === status;

      const isPaidNow = Number(o.is_paid || 0) === 1;
      const matchPaid =
        paid === "ALL" || (paid === "PAID" ? isPaidNow : !isPaidNow);

      return matchQ && matchStatus && matchPaid;
    });
  }, [orders, q, status, paid]);

  const totalRevenue = useMemo(
    () => filtered.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
    [filtered]
  );

  const paidCount = useMemo(
    () => filtered.filter((o) => Number(o.is_paid || 0) === 1).length,
    [filtered]
  );

  return (
    <div className="adminOrdersPage">
      <div className="adminOrdersHeader">
        <div>
          <h1 className="adminOrdersTitle">Food Orders</h1>
          <div className="adminOrdersSub">
            {loading
              ? "Loading..."
              : `${filtered.length} orders • ₹${totalRevenue.toFixed(
                  0
                )} total • ${paidCount} paid`}
          </div>
        </div>

        <button className="btnSmall2" onClick={loadOrders} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {err && <div className="adminMsg error">{err}</div>}

      <div className="adminOrdersFilters">
        <input
          className="adminInput"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: order id / stall / user..."
        />

        <select
          className="adminSelect"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="PLACED">PLACED</option>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="READY">READY</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        <select
          className="adminSelect"
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
        >
          <option value="ALL">All Payments</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
        </select>
      </div>

      <div className="adminOrdersCard">
        <div className="adminOrdersTable">
          <div className="th">Order</div>
          <div className="th">Stall</div>
          <div className="th">User</div>
          <div className="th">Total</div>
          <div className="th">Payment</div>
          <div className="th">Status</div>
          <div className="th">Actions</div>

          {filtered.map((o) => {
            const isPaidNow = Number(o.is_paid || 0) === 1;
            const pm = (o.payment_method || "CASH").toUpperCase();
            const st = String(o.status || "PLACED").toUpperCase();

            return (
              <div className="tr" key={o.id}>
                <div className="td">
                  <div className="idLine">#{o.id}</div>
                  <div className="mutedLine">
                    {o.created_at ? new Date(o.created_at).toLocaleString() : "-"}
                  </div>
                </div>

                <div className="td">
                  <div className="strong">{o.stall_name || `Stall #${o.stall_id}`}</div>
                  <div className="mutedLine">stall_id: {o.stall_id}</div>
                </div>

                <div className="td">
                  <div className="strong">{o.user_name || `User #${o.user_id}`}</div>
                  <div className="mutedLine">user_id: {o.user_id}</div>
                </div>

                <div className="td strong">₹{Number(o.total_amount || 0).toFixed(0)}</div>

                <div className="td">
                  <div className="payRow">
                    <span className="payTag">{pm}</span>
                    <span className={`payTag ${isPaidNow ? "paid" : "unpaid"}`}>
                      {isPaidNow ? "PAID" : "UNPAID"}
                    </span>
                  </div>
                </div>

                <div className="td">
                  <span className={`statusPill status-${st.toLowerCase()}`}>{st}</span>
                </div>

                <div className="td actions">
                  <Link className="miniBtn" to={`/admin/food/receipt/${o.id}`}>
                    Receipt
                  </Link>

                  {!isPaidNow && (
                    <button className="miniBtn" onClick={() => markPaid(o.id)}>
                      Mark Paid
                    </button>
                  )}

                  <select
                    className="miniSelect"
                    value={st}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                  >
                    <option value="PLACED">PLACED</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="READY">READY</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div className="adminEmpty2">No orders found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
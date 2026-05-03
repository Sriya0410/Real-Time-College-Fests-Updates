import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "../../styles/adminOrdersPage.css";

const getPanelToken = () =>
  localStorage.getItem("admin_token") ||
  localStorage.getItem("adminToken") ||
  localStorage.getItem("student_affairs_token") ||
  localStorage.getItem("token");

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
      const token = getPanelToken();

      if (!token) {
        throw new Error("Login token missing. Please login again.");
      }

      const res = await api.get("/admin/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOrders(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e) {
      const code = e?.response?.status;
      const data = e?.response?.data;

      if (code === 401) {
        setErr("Unauthorized (401). Please login again.");
      } else if (code === 403) {
        setErr(
          `Forbidden (403). Your role is not allowed. ${
            data?.yourRole ? `Your role: ${data.yourRole}. ` : ""
          }Allowed: ADMIN, STUDENT_AFFAIRS.`
        );
      } else {
        setErr(data?.message || e?.message || "Failed to load orders");
      }

      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async (orderId) => {
    setErr("");

    try {
      const token = getPanelToken();

      await api.patch(
        `/admin/orders/${orderId}/paid`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrders((prev) =>
        prev.map((o) => (Number(o.id) === Number(orderId) ? { ...o, is_paid: 1 } : o))
      );
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to mark paid");
    }
  };

  const updateStatus = async (orderId, nextStatus) => {
    setErr("");

    try {
      const token = getPanelToken();

      await api.patch(
        `/admin/orders/${orderId}/status`,
        { status: nextStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrders((prev) =>
        prev.map((o) =>
          Number(o.id) === Number(orderId) ? { ...o, status: nextStatus } : o
        )
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
        String(o.user_name || o.student_name || "").toLowerCase().includes(qq) ||
        String(o.user_phone || "").toLowerCase().includes(qq) ||
        String(o.user_email || "").toLowerCase().includes(qq);

      const matchStatus =
        status === "ALL" || String(o.status || "").toUpperCase() === status;

      const isPaidNow = Number(o.is_paid || 0) === 1;

      const matchPaid =
        paid === "ALL" || (paid === "PAID" ? isPaidNow : !isPaidNow);

      return matchQ && matchStatus && matchPaid;
    });
  }, [orders, q, status, paid]);

  const totalRevenue = useMemo(
    () =>
      filtered
        .filter((o) => Number(o.is_paid || 0) === 1)
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
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
                )} paid total • ${paidCount} paid`}
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
          placeholder="Search: order id / stall / user / phone / email..."
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
            const pm = String(o.payment_method || "CASH").toUpperCase();
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
                  <div className="strong">
                    {o.stall_name || `Stall #${o.stall_id}`}
                  </div>
                  <div className="mutedLine">stall_id: {o.stall_id}</div>
                </div>

                <div className="td">
                  <div className="strong">{o.user_name || `User #${o.user_id}`}</div>
                  <div className="mutedLine">user_id: {o.user_id}</div>
                  {o.user_phone ? (
                    <div className="mutedLine">phone: {o.user_phone}</div>
                  ) : null}
                </div>

                <div className="td strong">
                  ₹{Number(o.total_amount || 0).toFixed(0)}
                </div>

                <div className="td">
                  <div className="payRow">
                    <span className="payTag">{pm}</span>
                    <span className={`payTag ${isPaidNow ? "paid" : "unpaid"}`}>
                      {isPaidNow ? "PAID" : "UNPAID"}
                    </span>
                  </div>

                  {o.razorpay_payment_id ? (
                    <div className="mutedLine">
                      Ref: {String(o.razorpay_payment_id).slice(0, 18)}
                    </div>
                  ) : null}
                </div>

                <div className="td">
                  <span className={`statusPill status-${st.toLowerCase()}`}>
                    {st}
                  </span>
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

          {loading && <div className="adminEmpty2">Loading orders...</div>}
        </div>
      </div>
    </div>
  );
}
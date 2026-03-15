import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "../../styles/foodOrdersPage.css";

export default function StudentMyFoodOrders() {
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/food/orders/my");
      setOrders(res.data?.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    setErr("");
    try {
      await api.post(`/food/orders/${orderId}/cancel`);
      await loadOrders();
    } catch (e) {
      setErr(e?.response?.data?.message || "Cancel failed");
    }
  };

  const calcItemsTotal = (o) => {
    const items = o.items || [];
    return items.reduce(
      (sum, it) => sum + Number(it.price || 0) * Number(it.qty || 0),
      0
    );
  };

  const paymentMethodLabel = (o) =>
    o.payment_method ? String(o.payment_method).toUpperCase() : "CASH";

  const isPaid = (o) => Number(o.is_paid || 0) === 1;

  const canCancel = (o) => {
    const st = String(o.status || "").toUpperCase();
    return ["PLACED", "PENDING_PAYMENT"].includes(st);
  };

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>My Food Orders</h1>
      </div>

      {err && <div className="foodMsg error">{err}</div>}

      <div className="ordersTopBar">
        <button className="btnSmall2" onClick={loadOrders} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!loading && !orders.length && (
        <div className="card">No food orders yet.</div>
      )}

      <div className="ordersGrid">
        {orders.map((o) => (
          <div key={o.id} className="card orderCard">
            <div className="orderHead">
              <div>
                <div className="orderTitle">
                  {o.stall_name || "Food Stall"}
                </div>
                <div className="muted2">
                  Order #{o.id} •{" "}
                  {o.created_at
                    ? new Date(o.created_at).toLocaleString()
                    : "-"}
                </div>

                <div className="payInfo">
                  <span className="payTag">
                    PAYMENT: {paymentMethodLabel(o)}
                  </span>
                  <span
                    className={`payTag ${isPaid(o) ? "paid" : "unpaid"}`}
                  >
                    {isPaid(o) ? "PAID" : "UNPAID"}
                  </span>
                </div>
              </div>

              <span
                className={`statusPill status-${String(
                  o.status || "PLACED"
                ).toLowerCase()}`}
              >
                {String(o.status || "PLACED").toUpperCase()}
              </span>
            </div>

            <div className="orderItemsBox">
              {(o.items || []).map((it, idx) => (
                <div key={idx} className="orderItemRow">
                  <div className="orderItemLeft">
                    <span className="orderItemName">{it.name}</span>
                    <span
                      className={`vegDot small ${
                        it.is_veg ? "veg" : "nonveg"
                      }`}
                    />
                  </div>
                  <div className="orderItemRight">
                    <span className="muted2">
                      ₹{Number(it.price || 0).toFixed(0)}
                    </span>
                    <span className="muted2">x{it.qty}</span>
                  </div>
                </div>
              ))}

              {!o.items?.length && (
                <div className="muted2">No items data.</div>
              )}
            </div>

            <div className="orderBottom">
              <span className="muted2">Items total</span>
              <span className="orderTotal">
                ₹{calcItemsTotal(o).toFixed(0)}
              </span>
            </div>

            <div className="orderBottom">
              <span className="muted2">Order total</span>
              <span className="orderTotal">
                ₹{Number(o.total_amount || 0).toFixed(0)}
              </span>
            </div>

            {o.notes && <div className="orderNotes">Notes: {o.notes}</div>}

            {/* ✅ PERFECTLY ALIGNED ACTIONS */}
            <div
              className={`orderActions ${
                canCancel(o) ? "two" : "one"
              }`}
            >
              <Link
                className="btnSmall2 btnLink"
                to={`/student/food/receipt/${o.id}`}
              >
                Receipt
              </Link>

              {canCancel(o) && (
                <button
                  className="btnSmall2 btnDanger"
                  onClick={() => cancelOrder(o.id)}
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "../../styles/studentPayments.css"; // optional, if you have it

function humanAxiosError(e) {
  const msg =
    e?.response?.data?.message ||
    e?.message ||
    "Unknown error";

  if (String(msg).toLowerCase().includes("network error")) {
    return `Cannot reach backend.
Check:
1) Backend running?
2) VITE_API_URL correct?
3) Port 5000 open?`;
  }
  return msg;
}

function formatDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export default function StudentPayments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const totalPaid = useMemo(() => {
    return items.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [items]);

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      // ✅ NEW secure route: uses token userId in backend
      const res = await api.get("/student/payments");

      const payload = res.data;
      const rows = Array.isArray(payload) ? payload : payload?.data;
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setErr(humanAxiosError(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24, color: "white" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Payment History</h1>
          <div style={{ opacity: 0.85 }}>
            {loading ? "Loading..." : `${items.length} payments • Total ₹${totalPaid.toFixed(0)}`}
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.18)",
            fontWeight: 900,
            background: "rgba(255,255,255,.08)",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && <div style={{ opacity: 0.85, marginTop: 12 }}>Loading...</div>}

      {err && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,0,0,.12)" }}>
          {err}
        </div>
      )}

      {!loading && !err && items.length === 0 && (
        <div style={{ opacity: 0.85, marginTop: 12 }}>
          No payments found. (Free events will not appear here ✅)
        </div>
      )}

      {!loading && !err && items.length > 0 && (
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          {items.map((p) => {
            const status = String(p.status || "PENDING").toUpperCase();
            const eventTitle = p.event_title || p.title || "Event";

            return (
              <div
                key={p.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.06)",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>{eventTitle}</div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6, opacity: 0.95 }}>
                  <span>Amount: ₹{Number(p.amount || 0).toFixed(0)}</span>
                  <span>•</span>
                  <span>Status: {status}</span>
                </div>

                <div style={{ marginTop: 6, opacity: 0.9 }}>
                  Method: <b>{p.method || p.gateway || "-"}</b>
                </div>

                <div style={{ marginTop: 6, opacity: 0.9 }}>
                  Ref/UTR: <b>{p.transaction_ref || p.utr || p.reference_no || "-"}</b>
                </div>

                <div style={{ marginTop: 6, opacity: 0.85 }}>
                  Time: {formatDateTime(p.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
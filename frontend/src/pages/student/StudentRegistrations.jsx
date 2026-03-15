import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import TicketModal from "../../components/events/TicketModal";
import "../../styles/studentRegistrations.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const API = `${API_BASE}/api`;

function formatDatePretty(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}
function formatTimePretty(value) {
  if (!value) return "-";
  return String(value).slice(0, 5);
}

function humanFetchError(e) {
  const msg = String(e?.message || e || "");
  if (msg.toLowerCase().includes("failed to fetch")) {
    return `Cannot reach backend (${API_BASE}). 
Check:
1) Backend running?
2) Correct VITE_API_BASE?
3) Firewall blocking port 5000?
4) If using LAN IP, try localhost on same PC.`;
  }
  return msg || "Unknown error";
}

export default function StudentRegistrations() {
  const { user } = useAuth();
  const userId = user?.id ?? user?.user_id;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [ticketOpen, setTicketOpen] = useState(false);
  const [selectedRegId, setSelectedRegId] = useState(null);

  async function load() {
    if (!userId) {
      setErr("User session missing. Please login again.");
      setLoading(false);
      setItems([]);
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`${API}/registrations/my/${userId}`, {
        credentials: "include",
      });

      const data = await res.json().catch(() => null);
      if (!data) throw new Error("Server returned invalid JSON (check backend error logs).");

      if (!res.ok) throw new Error(data?.message || "Failed to load registrations");

      // your backend may return {ok:true, data:[...]} OR directly [...]
      const rows = Array.isArray(data) ? data : (data?.data ?? []);
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setErr(humanFetchError(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [userId]);

  async function cancelReg(id) {
    if (!window.confirm("Cancel this registration?")) return;
    try {
      const res = await fetch(`${API}/registrations/cancel/${id}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Cancel failed");

      await load();
    } catch (e) {
      alert(humanFetchError(e));
    }
  }

  function openTicket(regId) {
    setSelectedRegId(regId);
    setTicketOpen(true);
  }

  return (
    <div className="regPage">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 className="regTitle" style={{ margin: 0 }}>
          My Registrations
        </h1>

        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,.12)",
            fontWeight: 900,
            background: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {err && <div className="regError">{err}</div>}
      {loading && <div className="regState">Loading...</div>}
      {!loading && !err && items.length === 0 && <div className="regState">No registrations found.</div>}

      {!loading && !err && items.length > 0 && (
        <div className="regGrid">
          {items.map((r) => {
            const isPaid = !!r.is_paid;
            const priceText = isPaid ? `₹${Number(r.amount || 0).toFixed(0)}` : "Free";

            const timeText = (() => {
              const s = formatTimePretty(r.start_time);
              const e = r.end_time ? formatTimePretty(r.end_time) : "";
              return e ? `${s} - ${e}` : s;
            })();

            const statusText =
              r.status === "APPROVED"
                ? "Approved ✅"
                : r.status === "REJECTED"
                ? `Rejected ❌ (${r.rejection_reason || "No reason"})`
                : r.status === "CANCELLED"
                ? "Cancelled"
                : "Processing";

            return (
              <div key={r.id} className="regCard">
                <div className="regHead">
                  <div className="regEventTitle">{r.title}</div>
                  <div className={`regBadge ${isPaid ? "paid" : "free"}`}>
                    {isPaid ? `Paid • ${priceText}` : "Free"}
                  </div>
                </div>

                <div className="regDetails">
                  <div>
                    📅 {formatDatePretty(r.event_date)} | 🕒 {timeText}
                  </div>
                  <div>📍 {r.venue}</div>

                  <div className="regUserLine">
                    👤 {r.full_name} • {r.reg_no} • {r.branch} • Year {r.year}
                  </div>

                  <div>
                    <b>Status:</b> {statusText}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                    {r.status === "APPROVED" && (
                      <button
                        style={{ padding: "10px 12px", borderRadius: 12, border: 0, fontWeight: 900, cursor: "pointer" }}
                        onClick={() => openTicket(r.id)}
                      >
                        View Ticket / Download PDF
                      </button>
                    )}

                    {r.status !== "CANCELLED" && (
                      <button
                        style={{ padding: "10px 12px", borderRadius: 12, border: 0, fontWeight: 900, cursor: "pointer" }}
                        onClick={() => cancelReg(r.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TicketModal open={ticketOpen} onClose={() => setTicketOpen(false)} registrationId={selectedRegId} />
    </div>
  );
}
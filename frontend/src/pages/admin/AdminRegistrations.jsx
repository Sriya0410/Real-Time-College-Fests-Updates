import { useEffect, useMemo, useState } from "react";
import "../../styles/adminRegistrations.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const API = `${API_BASE}/api`;

const getToken = () => localStorage.getItem("admin_token");

export default function AdminRegistrations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((r) => {
      const hay = [
        r.full_name,
        r.reg_no,
        r.branch,
        r.year,
        r.title,
        r.event_title,
        r.utr,
        r.reference_no,
        r.payment_status,
        r.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(s);
    });
  }, [items, q]);

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      const token = getToken();
      if (!token) throw new Error("Admin token missing. Please login again.");

      const res = await fetch(`${API}/admin/registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => null);
      if (!json) throw new Error("Server returned invalid JSON");

      if (!res.ok) throw new Error(json?.message || "Failed to load registrations");

      setItems(Array.isArray(json?.data) ? json.data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load registrations");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="arPage">
      <div className="arHeader">
        <div>
          <h1>Recent Registrations</h1>
          <p>Latest registrations.</p>
        </div>
        <button className="btnSmall2" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="arToolbar">
        <input
          className="arSearch"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by student, reg no, event, UTR, reference..."
        />
        <div className="arCount">{loading ? "…" : `${filtered.length} results`}</div>
      </div>

      {loading && <div className="arInfo">Loading...</div>}
      {err && <div className="arError">{err}</div>}

      {!loading && !err && filtered.length === 0 && (
        <div className="arEmpty">
          <div className="arEmptyIcon">🗂️</div>
          <div className="arEmptyTitle">No registrations found.</div>
        </div>
      )}

      {!loading && !err && filtered.length > 0 && (
        <div className="arList">
          {filtered.map((r) => {
            const amountNow = Number(r.pay_amount || r.amount || 0);
            const isFreeEvent =
              Number(r.is_paid) === 0 ||
              amountNow === 0 ||
              String(r.payment_status || "").toUpperCase() === "FREE";

            return (
              <div className="arCard" key={r.id}>
                <div className="arTitle">{r.event_title || r.title || "Event"}</div>

                <div className="arMeta">
                  Student: <b>{r.full_name}</b> • {r.reg_no} • {r.branch} • Year {r.year}
                </div>

                <div className="arMeta">
                  Registration Status: <b>{r.status || "-"}</b>
                </div>

                <div className="arMeta">
                  {isFreeEvent ? (
                    <>
                      Payment: <b className="freeTag">Event is Free</b>
                    </>
                  ) : (
                    <>
                      Payment: ₹{amountNow.toFixed(0)} • Ref: <b>{r.reference_no || "-"}</b> • UTR:{" "}
                      <b>{r.utr || "-"}</b> • Payment Status: <b>{r.payment_status || "-"}</b>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
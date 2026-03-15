import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function VerifyTicket() {
  const [sp] = useSearchParams();
  const token = sp.get("token");

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setErr("Missing token");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setErr("");
      setData(null);

      try {
        // ✅ this must return JSON
        const res = await fetch(
          `${API_BASE}/api/registrations/verify?token=${encodeURIComponent(token)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Invalid ticket");
        setData(json);
      } catch (e) {
        setErr(e.message || "Invalid ticket");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>Ticket Verification</h1>

      {loading && <p>Checking ticket...</p>}
      {err && <p style={{ color: "crimson", fontWeight: 800 }}>{err}</p>}

      {data && (
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
          <h2 style={{ marginTop: 0 }}>{data.event?.title}</h2>
          <p><b>Venue:</b> {data.event?.venue}</p>
          <p><b>Date:</b> {String(data.event?.event_date).slice(0, 10)}</p>
          <p>
            <b>Time:</b>{" "}
            {String(data.event?.start_time).slice(0, 5)}
            {data.event?.end_time ? ` - ${String(data.event?.end_time).slice(0, 5)}` : ""}
          </p>
          <p><b>Ticket Code:</b> {data.ticketCode}</p>
          <p><b>Student:</b> {data.student?.full_name} ({data.student?.reg_no})</p>

          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              fontWeight: 900,
              background: "#e7ffe7",
              border: "1px solid #86efac",
            }}
          >
            ✅ VALID TICKET
          </div>
        </div>
      )}
    </div>
  );
}
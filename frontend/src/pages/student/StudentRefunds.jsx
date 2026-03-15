import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyRefunds } from "../../services/refundService";
import "../../styles/refunds.css";

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function statusClass(st) {
  const s = String(st || "").toUpperCase();
  if (s === "REFUNDED") return "refunded";
  if (s === "FAILED") return "failed";
  return "pending";
}

export default function StudentRefunds() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await fetchMyRefunds();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load refunds");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalRefunded = useMemo(() => {
    return rows
      .filter((r) => String(r.status || "").toUpperCase() === "REFUNDED")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
  }, [rows]);

  return (
    <div className="refundsPage">
      <div className="refundsHeader">
        <div>
          <h1 className="refundsTitle">Refund History</h1>
          <div className="refundsSub">
            {loading ? "Loading..." : `${rows.length} refunds • ₹${totalRefunded.toFixed(0)} refunded`}
          </div>
        </div>

        <button className="btnSmall2" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {err && <div className="adminMsg error">{err}</div>}

      <div className="refundsCard">
        <div className="refundsTable">
          <div className="th">Event</div>
          <div className="th">Amount</div>
          <div className="th">Method</div>
          <div className="th">Status</div>
          <div className="th">Date</div>
          <div className="th">Receipt</div>

          {rows.map((r) => {
            const st = String(r.status || "PENDING").toUpperCase();
            return (
              <div className="tr" key={r.id}>
                <div className="td" data-label="Event">
                  <div className="strong">{r.event_title || `Event #${r.event_id}`}</div>
                </div>

                <div className="td strong" data-label="Amount">
                  ₹{Number(r.amount || 0).toFixed(0)}
                </div>

                <div className="td" data-label="Method">
                  {(r.method || "RAZORPAY").toUpperCase()}
                </div>

                <div className="td" data-label="Status">
                  <span className={`statusPill ${statusClass(st)}`}>{st}</span>
                </div>

                <div className="td" data-label="Date">
                  {fmtDate(r.created_at)}
                </div>

                <div className="td" data-label="Receipt">
                  <Link to={`/student/refunds/receipt/${r.id}`} className="btnSmall2">
                    View Receipt
                  </Link>
                </div>
              </div>
            );
          })}

          {!loading && rows.length === 0 && <div className="adminEmpty2">No refunds yet.</div>}
        </div>
      </div>
    </div>
  );
}
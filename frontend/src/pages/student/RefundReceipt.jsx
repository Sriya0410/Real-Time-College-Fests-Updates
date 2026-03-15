import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchRefundReceipt } from "../../services/refundService";
import "../../styles/refunds.css";

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function RefundReceipt() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchRefundReceipt(id);
        setData(r);
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load receipt");
      }
    })();
  }, [id]);

  if (err)
    return (
      <div className="page">
        <div className="adminMsg error">{err}</div>
      </div>
    );

  if (!data)
    return (
      <div className="page">
        <div className="card">Loading receipt...</div>
      </div>
    );

  const st = String(data.status || "PENDING").toUpperCase();

  return (
    <div className="page">
      <div className="rfReceiptWrap">
        <div className="rfReceiptOuter">
          <div className="rfReceiptPaper" id="rf-receipt">
            <div className="rfCenter rfBold rfBrand">REFUND RECEIPT</div>
            <div className="rfCenter rfMuted">College Fest</div>

            <div className="rfLine" />

            <div className="rfRow2">
              <div>
                REFUND ID: <b>#{data.id}</b>
              </div>
              <div>{fmtDate(data.created_at)}</div>
            </div>

            <div className="rfRow2">
              <div>
                STATUS: <b>{st}</b>
              </div>
              <div>
                METHOD: <b>{String(data.method || "RAZORPAY").toUpperCase()}</b>
              </div>
            </div>

            <div className="rfLine" />

            <div className="rfKV">
              <span className="rfMuted">EVENT</span>
              <span className="rfBold">{data.event_title || `Event #${data.event_id}`}</span>
            </div>

            <div className="rfKV">
              <span className="rfMuted">AMOUNT</span>
              <span className="rfBold">₹{Number(data.amount || 0).toFixed(0)}</span>
            </div>

            <div className="rfKV">
              <span className="rfMuted">REFERENCE</span>
              <span>{data.reference_no || "-"}</span>
            </div>

            <div className="rfKV">
              <span className="rfMuted">PROCESSED AT</span>
              <span>{fmtDate(data.processed_at)}</span>
            </div>

            <div className="rfLine" />
            <div className="rfCenter rfSmall rfMuted">Keep this receipt for future reference.</div>
          </div>

          <div className="rfReceiptActions">
            <button className="btnSmall2" onClick={() => window.print()}>
              Print
            </button>
            <Link className="btnSmall2" to="/student/refunds">
              Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
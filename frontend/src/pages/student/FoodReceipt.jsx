import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api";
import "../../styles/foodReceipt.css";

function padRight(str, n) {
  str = String(str ?? "");
  return str.length >= n ? str.slice(0, n) : str + " ".repeat(n - str.length);
}
function padLeft(str, n) {
  str = String(str ?? "");
  return str.length >= n ? str.slice(0, n) : " ".repeat(n - str.length) + str;
}

export default function FoodReceipt() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/food/orders/${id}/receipt`);
        setData(res.data?.data || null);
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load receipt");
      }
    })();
  }, [id]);

  if (err) return <div className="page"><div className="foodMsg error">{err}</div></div>;
  if (!data) return <div className="page"><div className="card">Loading receipt...</div></div>;

  const o = data.order;
  const items = data.items || [];
  const t = data.totals || {};

  const dt = o.created_at ? new Date(o.created_at) : new Date();
  const dateStr = dt.toLocaleDateString();
  const timeStr = dt.toLocaleTimeString();

  const pm = String(o.payment_method || "CASH").toUpperCase();
  const paid = Number(o.is_paid || 0) === 1;

  return (
    <div className="page">
      <div className="receiptWrap">
        <div className="receiptPaper" id="receipt">
          <div className="center bold">COLLEGE FEST FOOD</div>
          <div className="center">{o.stall_name}</div>
          <div className="center">CUSTOMER COPY</div>

          <div className="line" />

          <div className="row2">
            <div>ORDER: {o.id}</div>
            <div>{dateStr}</div>
          </div>
          <div className="row2">
            <div>TIME: {timeStr}</div>
            <div>{pm}</div>
          </div>

          <div className="line" />

          <div className="items">
            {items.map((it, idx) => {
              const left = `${padLeft(it.qty, 2)} ${padRight(it.name, 20)}`;
              const right = padLeft(`₹${Number(it.line_total).toFixed(0)}`, 8);
              return (
                <div key={idx} className="itemLine">
                  <span>{left}</span>
                  <span>{right}</span>
                </div>
              );
            })}
          </div>

          <div className="line" />

          <div className="totals">
            <div className="kv">
              <span>SUBTOTAL</span>
              <span>₹{Number(t.subtotal || 0).toFixed(0)}</span>
            </div>
            <div className="kv">
              <span>TAX</span>
              <span>₹{Number(t.tax || 0).toFixed(0)}</span>
            </div>
            <div className="kv">
              <span>TIP</span>
              <span>₹{Number(t.tip || 0).toFixed(0)}</span>
            </div>
            <div className="kv bold">
              <span>TOTAL</span>
              <span>₹{Number(t.total || 0).toFixed(0)}</span>
            </div>
          </div>

          <div className="line" />

          <div className="small">
            PAYMENT: {pm} • {paid ? "PAID" : "UNPAID"}
          </div>

          {pm === "RAZORPAY" && o.razorpay_payment_id && (
            <div className="small">TXN: {o.razorpay_payment_id}</div>
          )}

          <div className="line" />
          <div className="center small">THANKS FOR VISITING</div>
          <div className="center small">COLLEGE FEST FOOD</div>
        </div>

        <div className="receiptActions">
          <button className="btnSmall2" onClick={() => window.print()}>Print</button>
          <Link className="btnSmall2" to="/student/food/orders">Back</Link>
        </div>
      </div>
    </div>
  );
}
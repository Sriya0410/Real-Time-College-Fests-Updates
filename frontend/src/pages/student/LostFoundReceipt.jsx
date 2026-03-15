import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api";
import "../../styles/lostFound.css";
import { fileUrl } from "../../utils/fileUrl";

export default function LostFoundReceipt() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/lostfound/${id}/receipt`);
        setData(res.data?.data || null);
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load receipt");
      }
    })();
  }, [id]);

  if (err) return <div className="page"><div className="lostMsg error">{err}</div></div>;
  if (!data) return <div className="page"><div className="card">Loading receipt...</div></div>;

  const dt = data.created_at ? new Date(data.created_at) : new Date();
  const status = String(data.status || "lost").toUpperCase();

  return (
    <div className="page">
      <div className="lfReceiptWrap">
        <div className="lfReceiptOuter">
          <div className="lfReceiptPaper" id="lf-receipt">
            <div className="lfCenter lfBold lfBrand">LOST & FOUND RECEIPT</div>
            <div className="lfCenter lfMuted">College Fest</div>

            <div className="lfLine" />

            <div className="lfRow2">
              <div>REPORT ID: <b>#{data.id}</b></div>
              <div>{dt.toLocaleString()}</div>
            </div>

            <div className="lfRow2">
              <div>STATUS: <b>{status}</b></div>
              <div>TYPE: <b>LOST</b></div>
            </div>

            <div className="lfLine" />

            <div className="lfKV">
              <span className="lfMuted">TITLE</span>
              <span className="lfBold">{data.title}</span>
            </div>

            <div className="lfKV">
              <span className="lfMuted">LOCATION</span>
              <span>{data.location || "-"}</span>
            </div>

            <div className="lfKV" style={{ alignItems: "flex-start" }}>
              <span className="lfMuted">DESCRIPTION</span>
              <span className="lfDesc">{data.description || "-"}</span>
            </div>

            {data.image_url && (
              <>
                <div className="lfLine" />
                <div className="lfCenter lfMuted lfSmall">IMAGE</div>
                <img className="lfReceiptImg" src={fileUrl(data.image_url)} alt="lost item" />
              </>
            )}

            <div className="lfLine" />
            <div className="lfCenter lfSmall lfMuted">
              Keep this receipt. Admin will update status when found.
            </div>
          </div>

          <div className="lfReceiptActions">
            <button className="btnSmall2" onClick={() => window.print()}>Print</button>
            <Link className="btnSmall2" to="/student/lostfound">Back</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/lostFound.css";

export default function StudentLostFoundReceipts() {
  const [ids, setIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("lf_receipt_ids") || "[]");
    } catch {
      return [];
    }
  });

  const rows = useMemo(() => ids.map((id) => ({ id: String(id) })), [ids]);

  const clearAll = () => {
    localStorage.removeItem("lf_receipt_ids");
    setIds([]);
  };

  const removeOne = (id) => {
    const next = ids.filter((x) => String(x) !== String(id));
    setIds(next);
    localStorage.setItem("lf_receipt_ids", JSON.stringify(next));
  };

  return (
    <div className="lostPage">
      <div className="lostHeader" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1>My Lost & Found Receipts</h1>
          <p className="lostSub">{rows.length} receipts saved</p>
        </div>

        <button className="btnSmall2" type="button" onClick={clearAll} disabled={!rows.length}>
          Clear All
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="lostMsg">No receipts yet. Submit a report first.</div>
      ) : (
        <div className="lfReceiptsCard">
          {rows.map((r) => (
            <div className="lfReceiptRow" key={r.id}>
              <div className="lfReceiptRowLeft">
                <div className="lfReceiptTitle">Lost Report #{r.id}</div>
                <div className="lfReceiptSub">Saved receipt</div>
              </div>

              <div className="lfReceiptRowRight">
                <Link className="btnSmall2" to={`/student/lostfound/receipt/${r.id}`}>
                  View
                </Link>
                <button className="btnSmall2" type="button" onClick={() => removeOne(r.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../../styles/lostFound.css";
import { fileUrl } from "../../utils/fileUrl";

export default function StudentReportLostItem() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [receipt, setReceipt] = useState(null);

  const [receiptIds, setReceiptIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("lf_receipt_ids") || "[]");
    } catch {
      return [];
    }
  });

  const saveReceiptId = (id) => {
    const next = Array.from(new Set([String(id), ...receiptIds]));
    setReceiptIds(next);
    localStorage.setItem("lf_receipt_ids", JSON.stringify(next));
  };

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setErr("");
    setMsg("");
    setReceipt(null);

    if (!f.type.startsWith("image/")) {
      setImage(null);
      setPreview("");
      setErr("Please select an image file.");
      return;
    }

    if (f.size > 3 * 1024 * 1024) {
      setImage(null);
      setPreview("");
      setErr("Image too large. Max 3MB.");
      return;
    }

    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const canSubmit = useMemo(
    () => form.title.trim().length > 0 && !loading,
    [form.title, loading]
  );

  const resetForm = () => {
    setForm({ title: "", description: "", location: "" });
    setImage(null);
    setPreview("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setReceipt(null);

    if (!form.title.trim()) return setErr("Title required");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("description", form.description?.trim() || "");
      fd.append("location", form.location?.trim() || "");
      if (image) fd.append("image", image);

      const res = await api.post("/lostfound", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const created = res.data?.data;
      setReceipt(created || null);

      if (created?.id) saveReceiptId(created.id);

      setMsg("Item reported successfully ✅");
      resetForm();
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  const prettyStatus = (s) => String(s || "lost").toUpperCase();

  const openReceipts = () => {
    nav("/student/lostfound/receipts");
  };

  return (
    <div className="lostPage">
      <button
        type="button"
        className="lfCornerReceiptsBtn"
        onClick={openReceipts}
        title="View all receipts"
      >
        Receipts
        {receiptIds.length ? (
          <span className="lfCornerBadge">{receiptIds.length}</span>
        ) : null}
      </button>

      <div className="lostHeader">
        <div>
          <h1>Report Lost Item</h1>
          <p className="lostSub">
            Add details + image. It will appear in Lost & Found.
          </p>
        </div>
      </div>

      {err && <div className="lostMsg error">{err}</div>}
      {msg && <div className="lostMsg">{msg}</div>}

      <form className="lostForm" onSubmit={submit}>
        <div className="formGroup">
          <label>Item Title *</label>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="e.g. Black Wallet"
          />
        </div>

        <div className="formGroup">
          <label>Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={4}
            placeholder="Describe the item..."
          />
        </div>

        <div className="formGroup">
          <label>Last Seen Location</label>
          <input
            name="location"
            value={form.location}
            onChange={onChange}
            placeholder="e.g. Auditorium"
          />
        </div>

        <div className="formGroup">
          <label>Upload Image (optional)</label>
          <input type="file" accept="image/*" onChange={onPickImage} />
          {preview && <img className="lostImgPreview" src={preview} alt="preview" />}
          <div className="hintText">Max 3MB • JPG/PNG • Optional</div>
        </div>

        <button className="primaryBtn" disabled={!canSubmit}>
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </form>

      {receipt && (
        <div className="lfReceiptWrap">
          <div className="lfReceiptOuter">
            <div className="lfReceiptPaper" id="lf-receipt">
              <div className="lfCenter lfBold lfBrand">LOST & FOUND RECEIPT</div>
              <div className="lfCenter lfMuted">College Fest</div>

              <div className="lfLine" />

              <div className="lfRow2">
                <div>
                  REPORT ID: <b>#{receipt.id}</b>
                </div>
                <div>
                  {receipt.created_at
                    ? new Date(receipt.created_at).toLocaleString()
                    : new Date().toLocaleString()}
                </div>
              </div>

              <div className="lfRow2">
                <div>
                  STATUS: <b>{prettyStatus(receipt.status)}</b>
                </div>
                <div>
                  TYPE: <b>LOST</b>
                </div>
              </div>

              <div className="lfLine" />

              <div className="lfKV">
                <span className="lfMuted">TITLE</span>
                <span className="lfBold">{receipt.title}</span>
              </div>

              <div className="lfKV">
                <span className="lfMuted">LOCATION</span>
                <span>{receipt.location || "-"}</span>
              </div>

              <div className="lfKV" style={{ alignItems: "flex-start" }}>
                <span className="lfMuted">DESCRIPTION</span>
                <span className="lfDesc">{receipt.description || "-"}</span>
              </div>

              {receipt.image_url && (
                <>
                  <div className="lfLine" />
                  <div className="lfCenter lfMuted lfSmall">IMAGE</div>
                  <img className="lfReceiptImg" src={fileUrl(receipt.image_url)} alt="lost item" />
                </>
              )}

              <div className="lfLine" />
              <div className="lfCenter lfSmall lfMuted">
                Keep this receipt. Admin will update status when found.
              </div>
            </div>

            <div className="lfReceiptActions">
              <button className="btnSmall2" onClick={() => window.print()} type="button">
                Print
              </button>
              <Link className="btnSmall2" to="/student/lostfound">
                Go to Lost & Found
              </Link>
              <button
                className="btnSmall2"
                type="button"
                onClick={() => nav(`/student/lostfound/receipt/${receipt.id}`)}
              >
                Open Receipt Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
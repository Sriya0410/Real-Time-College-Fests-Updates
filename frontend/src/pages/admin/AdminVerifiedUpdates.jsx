import { useMemo, useState } from "react";
import { postVerifiedUpdate } from "../../services/verifiedUpdateService";
import "../../styles/adminAnnouncements.css";

export default function AdminVerifiedUpdates() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    severity: "INFO",
  });

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const computed = useMemo(() => {
    const titleOk = form.title.trim().length >= 3;
    const msgOk = form.message.trim().length >= 5;
    const canSubmit = titleOk && msgOk && !submitting;
    return { titleOk, msgOk, canSubmit };
  }, [form, submitting]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!computed.canSubmit) {
      setErr("Please fill Title and Message properly.");
      return;
    }

    try {
      setSubmitting(true);

      const created = await postVerifiedUpdate({
        title: form.title.trim(),
        message: form.message.trim(),
        severity: form.severity,
      });

      alert(`✅ Verified Update posted!\nVerification Code: ${created.verification_code}`);
      setForm({ title: "", message: "", severity: "INFO" });
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Failed to post verified update");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="aaPage">
      <div className="aaHeader">
        <div>
          <h1>Post Verified Update</h1>
          <p>Students will see this with ✅ Verified badge + verification code.</p>
        </div>
        <span className="aaBadge">{submitting ? "Posting..." : "Admin"}</span>
      </div>

      {err && <div className="aaAlert">{err}</div>}

      <form className="aaCard" onSubmit={onSubmit}>
        <div className="aaGrid2">
          <div className="aaField">
            <label>Severity</label>
            <select
              value={form.severity}
              onChange={(e) => setField("severity", e.target.value)}
              disabled={submitting}
            >
              <option value="INFO">INFO</option>
              <option value="IMPORTANT">IMPORTANT</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          <div className="aaField">
            <label>Title *</label>
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g., Entry gate changed to Block B"
              disabled={submitting}
              required
            />
          </div>
        </div>

        <div className="aaField">
          <label>Message *</label>
          <textarea
            value={form.message}
            onChange={(e) => setField("message", e.target.value)}
            placeholder="Write official verified update..."
            disabled={submitting}
            rows={6}
            required
          />
        </div>

        <div className="aaActions">
          <button className="aaBtn" type="submit" disabled={!computed.canSubmit}>
            {submitting ? "Posting..." : "Post Verified Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
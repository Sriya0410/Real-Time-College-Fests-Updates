import { useState } from "react";
import { postLiveUpdate } from "../../services/liveUpdateService";
import "../../styles/adminLiveUpdates.css";

export default function AdminLiveUpdates() {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    event_id: "",
    type: "INFO",
    title: "",
    message: "",
  });

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    try {
      setSubmitting(true);

      await postLiveUpdate({
        ...form,
        event_id: form.event_id || null,
      });

      alert("✅ Live update posted!");

      setForm({
        event_id: "",
        type: "INFO",
        title: "",
        message: "",
      });
    } catch (e) {
      setErr(e?.message || "Failed to post live update");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="aluPage">
      <div className="aluHeader">
        <div>
          <h1>Post Live Update</h1>
          <p>Send realtime updates to students instantly.</p>
        </div>

        <span className="aluBadge">
          {submitting ? "Posting..." : "Admin"}
        </span>
      </div>

      {err && <div className="aluAlert">{err}</div>}

      <form className="aluCard" onSubmit={onSubmit}>
        {/* Event ID */}
        <div className="aluField">
          <label>Event ID (optional)</label>
          <input
            value={form.event_id}
            onChange={(e) => setField("event_id", e.target.value)}
            placeholder="Leave empty for global update"
            disabled={submitting}
          />
        </div>

        {/* Type */}
        <div className="aluField">
          <label>Type</label>
          <select
            value={form.type}
            onChange={(e) => setField("type", e.target.value)}
            disabled={submitting}
          >
            <option value="INFO">INFO</option>
            <option value="ALERT">ALERT</option>
            <option value="WARNING">WARNING</option>
          </select>
        </div>

        {/* Title */}
        <div className="aluField">
          <label>Title *</label>
          <input
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="e.g., Event starting soon"
            required
            disabled={submitting}
          />
        </div>

        {/* Message */}
        <div className="aluField">
          <label>Message *</label>
          <textarea
            value={form.message}
            onChange={(e) => setField("message", e.target.value)}
            placeholder="Write update for students..."
            required
            disabled={submitting}
            rows={4}
          />
        </div>

        <div className="aluActions">
          <button className="aluBtn" type="submit" disabled={submitting}>
            {submitting ? "Posting..." : "Post Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
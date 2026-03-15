import { useMemo, useState } from "react";
import { postAnnouncement } from "../../services/announcementService";
import "../../styles/adminAnnouncements.css";

export default function AdminAnnouncements() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    priority: "MEDIUM", // ✅ matches DB enum ('LOW','MEDIUM','HIGH')
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

      await postAnnouncement({
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority, // LOW/MEDIUM/HIGH
      });

      alert("✅ Announcement posted successfully!");
      setForm({ title: "", message: "", priority: "MEDIUM" });
    } catch (e2) {
      setErr(e2?.message || "Failed to post announcement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="aaPage">
      <div className="aaHeader">
        <div>
          <h1>Post Announcement</h1>
          <p>Admin posts will be visible to students instantly (realtime).</p>
        </div>

        <span className="aaBadge">{submitting ? "Posting..." : "Admin"}</span>
      </div>

      {err && <div className="aaAlert">{err}</div>}

      <form className="aaCard" onSubmit={onSubmit}>
        <div className="aaGrid2">
          <div className="aaField">
            <label>Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
              disabled={submitting}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>

            <div className="aaHint">
              {form.priority === "HIGH"
                ? "High priority appears more prominent."
                : form.priority === "LOW"
                ? "Low priority for general info."
                : "Medium priority for standard updates."}
            </div>
          </div>

          <div className="aaField">
            <label>Title *</label>
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g., Event delayed by 30 mins"
              disabled={submitting}
              required
            />
            {!computed.titleOk && form.title && (
              <div className="aaHint">Title should be at least 3 characters.</div>
            )}
          </div>
        </div>

        <div className="aaField">
          <label>Message *</label>
          <textarea
            value={form.message}
            onChange={(e) => setField("message", e.target.value)}
            placeholder="Write announcement details..."
            disabled={submitting}
            rows={6}
            required
          />
          {!computed.msgOk && form.message && (
            <div className="aaHint">Message should be at least 5 characters.</div>
          )}
        </div>

        <div className="aaActions">
          <button className="aaBtn" type="submit" disabled={!computed.canSubmit}>
            {submitting ? "Posting..." : "Post Announcement"}
          </button>

          <button
            className="aaBtn aaBtnGhost"
            type="button"
            disabled={submitting}
            onClick={() => setForm({ title: "", message: "", priority: "MEDIUM" })}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
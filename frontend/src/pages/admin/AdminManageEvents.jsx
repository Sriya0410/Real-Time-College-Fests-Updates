import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "../../styles/adminManageEvents.css";

const fmtDate = (v) => (v ? String(v).slice(0, 10) : "");
const fmtTime = (v) => (v ? String(v).slice(0, 5) : "");

// helper: show computed status if backend sends it
const showStatus = (ev) => ev?.computed_status || ev?.status || "-";

export default function AdminManageEvents() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/events");
      const payload = res.data?.data;
      const all = Array.isArray(payload?.all)
        ? payload.all
        : Array.isArray(payload)
        ? payload
        : [];
      setItems(all);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load events");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((ev) => {
      const hay = [
        ev.title,
        ev.description,
        ev.venue,
        ev.status,
        ev.computed_status,
        ev.category_name,
        ev.category_id,
        ev.is_paid ? "paid" : "free",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(s);
    });
  }, [items, q]);

  const openEdit = (ev) => {
    setEditing({
      ...ev,
      event_date: fmtDate(ev.event_date),
      start_time: ev.start_time ? String(ev.start_time).slice(0, 8) : "10:00:00",
      end_time: ev.end_time ? String(ev.end_time).slice(0, 8) : "12:00:00",
      price: Number(ev.price || 0),
      capacity: ev.capacity ?? 0,
      is_paid: ev.is_paid ? 1 : 0,
      status: ev.status || "UPCOMING",
    });
  };

  const setField = (k, v) => setEditing((p) => ({ ...p, [k]: v }));

  const saveEdit = async () => {
    if (!editing) return;

    if (!String(editing.title || "").trim()) return alert("Title required");
    if (!String(editing.event_date || "").trim()) return alert("Event date required");
    if (!String(editing.start_time || "").trim()) return alert("Start time required");
    if (Number(editing.is_paid) === 1 && !(Number(editing.price) > 0)) {
      return alert("Paid event needs price > 0");
    }

    setSaving(true);
    setErr("");

    try {
      await api.put(`/events/${editing.id}`, {
        category_id: Number(editing.category_id),
        title: String(editing.title || "").trim(),
        description: String(editing.description || "").trim(),
        event_date: editing.event_date,
        start_time:
          editing.start_time.length === 5
            ? `${editing.start_time}:00`
            : editing.start_time,
        end_time: editing.end_time
          ? editing.end_time.length === 5
            ? `${editing.end_time}:00`
            : editing.end_time
          : null,
        venue: String(editing.venue || "").trim(),
        is_paid: Number(editing.is_paid) === 1 ? 1 : 0,
        price: Number(editing.is_paid) === 1 ? Number(editing.price || 0) : 0,
        capacity: Number(editing.capacity || 0),
        status: editing.status || "UPCOMING",
      });

      setEditing(null);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    setErr("");
    try {
      await api.delete(`/events/${id}`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="amePage">
      <div className="ameHeader">
        <div>
          <h1>Manage Events</h1>
          <p>Edit or delete events.</p>
        </div>

        <div className="ameActions">
          <input
            className="ameSearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, venue, paid/free, status..."
          />
          <button className="btnSmall2" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {err && <div className="ameMsg error">{err}</div>}
      {loading && <div className="ameMsg">Loading events...</div>}

      {!loading && filtered.length === 0 && (
        <div className="ameMsg">No events found.</div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="ameGrid">
          {filtered.map((ev) => (
            <div key={ev.id} className="ameCard">
              <div className="ameTitle">{ev.title}</div>

              <div className="ameMeta">
                📅 {fmtDate(ev.event_date)} • ⏰ {fmtTime(ev.start_time)}
                {ev.end_time ? ` - ${fmtTime(ev.end_time)}` : ""}
              </div>

              <div className="ameMeta">
                📍 {ev.venue || "-"}
              </div>

              <div className="ameMeta">
                {ev.is_paid ? `₹${Number(ev.price || 0).toFixed(0)}` : "Free"} • Capacity:{" "}
                {Number(ev.capacity || 0) > 0 ? ev.capacity : "Unlimited"} • Status:{" "}
                <b>{showStatus(ev)}</b>
              </div>

              <div className="ameBtns">
                <button className="ameBtn" onClick={() => openEdit(ev)}>
                  Edit
                </button>
                <button className="ameBtn danger" onClick={() => deleteEvent(ev.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="ameModalBackdrop" onClick={() => setEditing(null)}>
          <div className="ameModal" onClick={(e) => e.stopPropagation()}>
            <div className="ameModalHead">
              <div className="ameModalTitle">Edit Event</div>
              <button className="btnSmall2" onClick={() => setEditing(null)} disabled={saving}>
                Close
              </button>
            </div>

            <div className="ameForm">
              <label>
                Title
                <input
                  value={editing.title || ""}
                  onChange={(e) => setField("title", e.target.value)}
                />
              </label>

              <label>
                Description
                <textarea
                  rows={3}
                  value={editing.description || ""}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </label>

              <div className="ameRow2">
                <label>
                  Date
                  <input
                    type="date"
                    value={editing.event_date || ""}
                    onChange={(e) => setField("event_date", e.target.value)}
                  />
                </label>

                <label>
                  Status (Manual)
                  <select
                    value={editing.status || "UPCOMING"}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="LIVE">LIVE</option>
                    <option value="FULL">FULL</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>

                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    Computed: <b>{editing.computed_status || "—"}</b>
                  </div>
                </label>
              </div>

              <div className="ameRow2">
                <label>
                  Start time
                  <input
                    type="time"
                    value={editing.start_time ? editing.start_time.slice(0, 5) : ""}
                    onChange={(e) => setField("start_time", e.target.value)}
                  />
                </label>

                <label>
                  End time
                  <input
                    type="time"
                    value={editing.end_time ? editing.end_time.slice(0, 5) : ""}
                    onChange={(e) => setField("end_time", e.target.value)}
                  />
                </label>
              </div>

              <label>
                Venue
                <input
                  value={editing.venue || ""}
                  onChange={(e) => setField("venue", e.target.value)}
                />
              </label>

              <div className="ameRow2">
                <label>
                  Paid?
                  <select
                    value={String(editing.is_paid)}
                    onChange={(e) => setField("is_paid", Number(e.target.value))}
                  >
                    <option value="0">Free</option>
                    <option value="1">Paid</option>
                  </select>
                </label>

                <label>
                  Price (₹)
                  <input
                    type="number"
                    value={Number(editing.price || 0)}
                    onChange={(e) => setField("price", Number(e.target.value))}
                    disabled={Number(editing.is_paid) !== 1}
                  />
                </label>
              </div>

              <label>
                Capacity (0 = Unlimited)
                <input
                  type="number"
                  value={Number(editing.capacity || 0)}
                  onChange={(e) => setField("capacity", Number(e.target.value))}
                />
              </label>

              <div className="ameModalFoot">
                <button className="ameBtn" onClick={saveEdit} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  className="ameBtn danger"
                  onClick={() => deleteEvent(editing.id)}
                  disabled={saving}
                >
                  Delete Event
                </button>
              </div>
            </div>

            {err && (
              <div className="ameMsg error" style={{ marginTop: 10 }}>
                {err}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
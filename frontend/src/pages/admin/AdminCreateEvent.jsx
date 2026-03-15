import { useEffect, useMemo, useState } from "react";
import { createEvent, fetchCategories } from "../../services/eventService";
import "../../styles/adminCreateEvent.css";

export default function AdminCreateEvent() {
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    category_id: "",
    title: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    venue: "",
    is_paid: false,
    price: "",
    capacity: "",
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingCats(true);
        const cats = await fetchCategories();
        if (alive) setCategories(Array.isArray(cats) ? cats : []);
      } catch (e) {
        if (alive) setErr("Failed to load categories");
      } finally {
        if (alive) setLoadingCats(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const computed = useMemo(() => {
    const titleOk = String(form.title || "").trim().length >= 3;
    const catOk = !!form.category_id;
    const dateOk = !!form.event_date;
    const startOk = !!form.start_time;
    const venueOk = String(form.venue || "").trim().length >= 2;

    const paid = !!form.is_paid;
    const priceNum = Number(form.price);
    const priceOk = !paid || (!Number.isNaN(priceNum) && priceNum >= 0);

    const capEmpty = String(form.capacity || "").trim() === "";
    const capNum = Number(form.capacity);
    const capOk = capEmpty || (!Number.isNaN(capNum) && capNum >= 1);

    let timeOk = true;
    if (form.start_time && form.end_time) {
      timeOk = form.end_time > form.start_time; // works for same-day time inputs
    }

    const canSubmit = titleOk && catOk && dateOk && startOk && venueOk && priceOk && capOk && timeOk;

    return {
      canSubmit,
      titleOk,
      priceOk,
      capOk,
      timeOk,
      paid,
      priceNum,
      capNum,
      capEmpty,
    };
  }, [form]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!computed.canSubmit) {
      setErr("Please fill required fields correctly.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        category_id: Number(form.category_id),
        title: form.title.trim(),
        description: form.description?.trim() || null,
        event_date: form.event_date,
        start_time: form.start_time,
        end_time: form.end_time || null,
        venue: form.venue.trim(),
        is_paid: !!form.is_paid,
        price: form.is_paid ? Number(form.price || 0) : null,
        capacity: String(form.capacity || "").trim() ? Number(form.capacity) : null,
      };

      await createEvent(payload);

      alert("✅ Event created successfully!");
      setForm({
        category_id: "",
        title: "",
        description: "",
        event_date: "",
        start_time: "",
        end_time: "",
        venue: "",
        is_paid: false,
        price: "",
        capacity: "",
      });
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="acePage">
      <div className="aceHeader">
        <div>
          <h1>Create Event</h1>
          
        </div>

        <div className="aceHeaderRight">
          <span className="aceBadge">{submitting ? "Saving..." : "Admin"}</span>
        </div>
      </div>

      {err && <div className="aceAlert">{err}</div>}

      <form className="aceCard" onSubmit={onSubmit}>
        <div className="aceGrid2">
          <div className="aceField">
            <label>Category *</label>
            <select
              value={form.category_id}
              onChange={(e) => setField("category_id", e.target.value)}
              disabled={loadingCats || submitting}
              required
            >
              <option value="">{loadingCats ? "Loading..." : "Select category"}</option>
              {categories.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="aceField">
            <label>Venue *</label>
            <input
              value={form.venue}
              onChange={(e) => setField("venue", e.target.value)}
              placeholder="e.g., Main Auditorium"
              disabled={submitting}
              required
            />
          </div>
        </div>

        <div className="aceField">
          <label>Title *</label>
          <input
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="e.g., Hackathon 2026"
            disabled={submitting}
            required
          />
          {!computed.titleOk && form.title && (
            <div className="aceHint">Title should be at least 3 characters.</div>
          )}
        </div>

        <div className="aceField">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Add details, rules, instructions (optional)"
            disabled={submitting}
            rows={4}
          />
        </div>

        <div className="aceGrid3">
          <div className="aceField">
            <label>Date *</label>
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => setField("event_date", e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="aceField">
            <label>Start Time *</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setField("start_time", e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="aceField">
            <label>End Time</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setField("end_time", e.target.value)}
              disabled={submitting}
            />
            {!computed.timeOk && (
              <div className="aceHint">End time must be after start time.</div>
            )}
          </div>
        </div>

        <div className="aceDivider" />

        <div className="aceGrid3">
          <div className="aceField aceCheck">
            <label className="aceCheckRow">
              <input
                type="checkbox"
                checked={form.is_paid}
                onChange={(e) => setField("is_paid", e.target.checked)}
                disabled={submitting}
              />
              Paid Event
            </label>
            <div className="aceHint">
              {form.is_paid ? "Students must pay to register." : "Free registration."}
            </div>
          </div>

          <div className="aceField">
            <label>Price (₹) {form.is_paid ? "*" : ""}</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
              disabled={!form.is_paid || submitting}
              min="0"
              placeholder={form.is_paid ? "e.g., 100" : "Enable Paid Event"}
            />
            {!computed.priceOk && (
              <div className="aceHint">Price must be 0 or more.</div>
            )}
          </div>

          <div className="aceField">
            <label>Capacity</label>
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setField("capacity", e.target.value)}
              min="1"
              placeholder="Leave empty for unlimited"
              disabled={submitting}
            />
            {!computed.capOk && <div className="aceHint">Capacity must be 1 or more.</div>}
          </div>
        </div>

        <div className="aceActions">
          <button
            className="aceBtn"
            type="submit"
            disabled={!computed.canSubmit || submitting}
          >
            {submitting ? "Creating..." : "Create Event"}
          </button>

          <button
            className="aceBtn aceBtnGhost"
            type="button"
            onClick={() =>
              setForm({
                category_id: "",
                title: "",
                description: "",
                event_date: "",
                start_time: "",
                end_time: "",
                venue: "",
                is_paid: false,
                price: "",
                capacity: "",
              })
            }
            disabled={submitting}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
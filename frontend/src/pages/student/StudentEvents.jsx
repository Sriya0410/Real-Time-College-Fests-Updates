import { useEffect, useMemo, useState } from "react";
import { fetchCategories, fetchEvents } from "../../services/eventService";
import { useSocket } from "../../context/SocketContext";
import EventCard from "../../components/events/EventCard";
import "../../styles/eventsPremium.css";

function toEventDateTime(ev) {
  const dateStr = ev?.event_date ? String(ev.event_date).slice(0, 10) : null;
  const timeStr = ev?.start_time ? String(ev.start_time).slice(0, 8) : "00:00:00";
  if (!dateStr) return null;

  const d = new Date(`${dateStr}T${timeStr}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function StudentEvents() {
  const { socket, connected } = useSocket();

  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState({ categoryId: "", paid: "" });
  const [data, setData] = useState({ upcoming: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const params = useMemo(() => {
    const p = {};
    if (filter.categoryId) p.categoryId = filter.categoryId;
    if (filter.paid) p.paid = filter.paid;
    return p;
  }, [filter]);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [cats, events] = await Promise.all([
        fetchCategories(),
        fetchEvents(params),
      ]);

      setCategories(Array.isArray(cats) ? cats : []);
      setData({
        upcoming: Array.isArray(events?.upcoming) ? events.upcoming : [],
        completed: Array.isArray(events?.completed) ? events.completed : [],
      });
    } catch (e) {
      console.error("Events load error:", e);
      setError("Failed to load events. Check backend/API/DB connection.");
      setCategories([]);
      setData({ upcoming: [], completed: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [params]);

  useEffect(() => {
    if (!socket || !connected) return;

    const reload = () => load();

    socket.on("event:created", reload);
    socket.on("event:updated", reload);
    socket.on("event:status", reload);

    return () => {
      socket.off("event:created", reload);
      socket.off("event:updated", reload);
      socket.off("event:status", reload);
    };
    // eslint-disable-next-line
  }, [socket, connected]);

  const allEvents = useMemo(() => {
    const now = new Date();

    const upcomingOnly = data.upcoming.filter((ev) => {
      const dt = toEventDateTime(ev);
      if (!dt) return true;
      return dt > now;
    });

    const q = search.trim().toLowerCase();

    let filtered = upcomingOnly;

    if (q) {
      filtered = filtered.filter((e) => {
        const title = String(e.title || "").toLowerCase();
        const venue = String(e.venue || "").toLowerCase();
        const cat = String(
          e.category_name || e.category || e.categoryTitle || ""
        ).toLowerCase();

        return title.includes(q) || venue.includes(q) || cat.includes(q);
      });
    }

    return [...filtered].sort((a, b) => {
      const da = toEventDateTime(a)?.getTime() || 0;
      const db = toEventDateTime(b)?.getTime() || 0;
      return da - db;
    });
  }, [data, search]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }, []);

  return (
    <div className="eventsPage2">
      <section className="eventsHero2">
        <h1>BTech University Events</h1>
        <p>Discover amazing events across all categories and campuses</p>
        <div className="todayPill2">Today: {todayStr}</div>
      </section>

      <section className="filtersPanel2">
        <input
          className="search2"
          placeholder="Search events by title, venue, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filtersRow2">
          <select
            className="select2"
            value={filter.categoryId}
            onChange={(e) =>
              setFilter((f) => ({ ...f, categoryId: e.target.value }))
            }
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="select2"
            value={filter.paid}
            onChange={(e) =>
              setFilter((f) => ({ ...f, paid: e.target.value }))
            }
          >
            <option value="">Paid + Free</option>
            <option value="true">Paid</option>
            <option value="false">Free</option>
          </select>

          <button
            type="button"
            className="reset2"
            onClick={() => {
              setFilter({ categoryId: "", paid: "" });
              setSearch("");
            }}
          >
            Reset
          </button>
        </div>
      </section>

      {error && <div className="msg2">{error}</div>}
      {loading && <div className="msg2">Loading...</div>}

      {!loading && (
        <section className="allWrap2">
          <div className="allHead2">
            <div className="allTitle2">
              ALL EVENTS <span>({allEvents.length})</span>
            </div>
            <div className="allLine2" />
          </div>

          <div className="grid2">
            {allEvents.length ? (
              allEvents.map((e) => <EventCard key={e.id} event={e} />)
            ) : (
              <div className="msg2">No events found.</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "../../styles/studentCompletedEvents.css";

function toDateTime(dateVal, timeVal) {
  if (!dateVal) return null;

  const dateStr = String(dateVal).slice(0, 10);
  const [y, m, d] = dateStr.split("-").map(Number);

  const timeStr = timeVal ? String(timeVal).slice(0, 8) : "00:00:00";
  const [hh, mm, ss] = timeStr.split(":").map((n) => Number(n || 0));

  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(String(date).slice(0, 10)).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeRange(startTime, endTime) {
  const start = startTime ? String(startTime).slice(0, 5) : "--:--";
  const end = endTime ? String(endTime).slice(0, 5) : "";
  return end ? `${start} - ${end}` : start;
}

export default function StudentCompletedEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const loadCompletedEvents = async () => {
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

      const nowMs = Date.now();

      const completed = all.filter((ev) => {
        const start = toDateTime(ev.event_date, ev.start_time);
        if (!start) return false;
        return start.getTime() < nowMs;
      });

      completed.sort((a, b) => {
        const aStart = toDateTime(a.event_date, a.start_time)?.getTime() || 0;
        const bStart = toDateTime(b.event_date, b.start_time)?.getTime() || 0;
        return bStart - aStart;
      });

      setEvents(completed);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load completed events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompletedEvents();
  }, []);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }, []);

  return (
    <div className="completedPage">
      <section className="completedHero">
        <div className="completedHeroContent">
          <div className="completedMiniTag">Event Archive</div>
          <h1>Completed Events</h1>
          <p>Browse all events whose start time has already passed</p>
          <div className="completedPill">Today: {todayStr}</div>
        </div>
      </section>

      <section className="completedHeader">
        <div>
          <h2>Past Events Archive</h2>
          <div className="completedSubText">
            View recently completed college fest activities
          </div>
        </div>

        <button
          className="btnSmall2"
          onClick={loadCompletedEvents}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </section>

      {err && <div className="completedMsg error">{err}</div>}

      {loading && <div className="completedLoading">Loading completed events...</div>}

      {!loading && !events.length && (
        <div className="completedEmpty">
          <div className="completedEmptyTitle">No completed events yet</div>
          <div className="completedEmptyText">
            Once an event's start time has passed, it will appear here.
          </div>
        </div>
      )}

      {!loading && !!events.length && (
        <section className="completedWrap">
          <div className="completedHead">
            <div className="completedSectionTitle">
              COMPLETED EVENTS <span>({events.length})</span>
            </div>
            <div className="completedLine" />
          </div>

          <div className="completedGrid">
            {events.map((ev) => (
              <div key={ev.id} className="completedCard">
                <div className="completedCardTop">
                  <div className="completedCat">
                    {ev.category_name || "Category"}
                  </div>
                  <div className="completedBadge">COMPLETED</div>
                </div>

                <div className="completedTitle">{ev.title}</div>

                <div className="completedMetaWrap">
                  <div className="completedMeta">
                    <span className="metaIcon">📍</span>
                    <span>{ev.venue || "-"}</span>
                  </div>

                  <div className="completedMeta">
                    <span className="metaIcon">📅</span>
                    <span>{formatDate(ev.event_date)}</span>
                  </div>

                  <div className="completedMeta">
                    <span className="metaIcon">⏰</span>
                    <span>{formatTimeRange(ev.start_time, ev.end_time)}</span>
                  </div>
                </div>

                {!!ev.description && (
                  <p className="completedDesc">{ev.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
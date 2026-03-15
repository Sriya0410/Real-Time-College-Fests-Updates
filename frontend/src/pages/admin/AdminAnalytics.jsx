import { useEffect, useMemo, useRef, useState } from "react";
import { listAnalyticsEvents } from "../../services/analyticsService";
import AttendanceDashboard from "../../components/analytics/AttendanceDashboard";
import FinanceDashboard from "../../components/analytics/FinanceDashboard";
import "../../styles/analytics.css";

function formatDateLabel(dateStr) {
  if (!dateStr) return "Unknown Date";

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);

  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeLabel(timeStr) {
  if (!timeStr) return "";

  const raw = String(timeStr).slice(0, 5);
  const [hh = "00", mm = "00"] = raw.split(":");
  let h = Number(hh);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;

  return `${h}:${mm} ${suffix}`;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);

  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export default function AdminAnalytics() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [tab, setTab] = useState("ATTENDANCE");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef(null);

  const selectedEvent = useMemo(
    () => events.find((e) => String(e.id) === String(eventId)),
    [events, eventId]
  );

  const groupedEvents = useMemo(() => {
    const map = new Map();

    for (const ev of events) {
      const key = ev.event_date || "unknown";

      if (!map.has(key)) {
        map.set(key, {
          key,
          label: formatDateLabel(ev.event_date),
          items: [],
        });
      }

      map.get(key).items.push(ev);
    }

    return Array.from(map.values());
  }, [events]);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const list = await listAnalyticsEvents();
        const finalList = Array.isArray(list) ? list : [];
        setEvents(finalList);

        if (finalList.length) {
          const todayEvent = finalList.find((ev) => isToday(ev.event_date));
          setEventId(String((todayEvent || finalList[0]).id));
        } else {
          setEventId("");
        }
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load events");
      }
    })();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!dropdownRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = selectedEvent
    ? `#${selectedEvent.id} • ${selectedEvent.title}${
        selectedEvent.start_time ? ` • ${formatTimeLabel(selectedEvent.start_time)}` : ""
      }`
    : "Select Event";

  return (
    <div className="anPage">
      <div className="anHead">
        <div>
          <h1 className="anTitle">Post-Event Analytics</h1>
          <div className="anSub">Attendance • Revenue • Expenses</div>
        </div>

        <div className="anControls">
          <div className="anDropdown" ref={dropdownRef}>
            <button
              type="button"
              className={`anDropdownBtn ${open ? "open" : ""}`}
              onClick={() => setOpen((prev) => !prev)}
            >
              <span className="anDropdownText">{selectedLabel}</span>
              <span className={`anDropdownArrow ${open ? "open" : ""}`}>⌄</span>
            </button>

            {open && (
              <div className="anDropdownMenu">
                {groupedEvents.length === 0 ? (
                  <div className="anDropdownEmpty">No events found</div>
                ) : (
                  groupedEvents.map((group) => (
                    <div key={group.key} className="anDropdownGroup">
                      <div className="anDropdownGroupLabel">{group.label}</div>

                      {group.items.map((ev) => {
                        const active = String(ev.id) === String(eventId);

                        return (
                          <button
                            key={ev.id}
                            type="button"
                            className={`anDropdownItem ${active ? "active" : ""}`}
                            onClick={() => {
                              setEventId(String(ev.id));
                              setOpen(false);
                            }}
                          >
                            <span className="anDropdownItemTitle">
                              #{ev.id} • {ev.title}
                            </span>
                            {ev.start_time && (
                              <span className="anDropdownItemMeta">
                                {formatTimeLabel(ev.start_time)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="anTabs">
            <button
              className={`anTab ${tab === "ATTENDANCE" ? "active" : ""}`}
              onClick={() => setTab("ATTENDANCE")}
            >
              Attendance
            </button>

            <button
              className={`anTab ${tab === "FINANCE" ? "active" : ""}`}
              onClick={() => setTab("FINANCE")}
            >
              Revenue & Expenses
            </button>
          </div>
        </div>
      </div>

      {err && <div className="anErr">{err}</div>}
      {!eventId ? <div className="anCard">No events found.</div> : null}

      {eventId && tab === "ATTENDANCE" && (
        <AttendanceDashboard eventId={eventId} event={selectedEvent} />
      )}

      {eventId && tab === "FINANCE" && (
        <FinanceDashboard eventId={eventId} event={selectedEvent} />
      )}
    </div>
  );
}
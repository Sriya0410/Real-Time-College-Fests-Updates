import { useEffect, useMemo, useState } from "react";
import { getAttendanceSummary } from "../../services/analyticsService";

export default function AttendanceDashboard({ eventId, event }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!eventId) return;

    (async () => {
      try {
        setErr("");
        const d = await getAttendanceSummary(eventId);
        setData(d);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load attendance");
        setData(null);
      }
    })();
  }, [eventId]);

  const kpi = useMemo(() => data || {}, [data]);
  const isCompleted = kpi.attendanceStatus === "COMPLETED";
  const isOngoing = kpi.attendanceStatus === "ONGOING";

  return (
    <div className="anCard">
      <div className="anCardHead">
        <div className="anCardTitle">Attendance Summary</div>
        <div className="anCardMeta">
          Event: <b>{event?.title || "-"}</b>
        </div>
      </div>

      {err && <div className="anErr">{err}</div>}

      {!data ? (
        <div className="anEmpty">Loading…</div>
      ) : (
        <>
          <div className="anKpis">
            <div className="anKpi">
              <div className="anKpiLabel">Registrations</div>
              <div className="anKpiValue">{kpi.registrations || 0}</div>
            </div>

            <div className="anKpi">
              <div className="anKpiLabel">Checked In</div>
              <div className="anKpiValue">{kpi.checkins || 0}</div>
            </div>

            <div className="anKpi">
              <div className="anKpiLabel">
                {isCompleted ? "Absent" : isOngoing ? "Yet to Check In" : "Expected"}
              </div>
              <div className="anKpiValue">
                {isCompleted ? (kpi.absent || 0) : "-"}
              </div>
            </div>

            <div className="anKpi">
              <div className="anKpiLabel">Attendance %</div>
              <div className="anKpiValue">
                {isCompleted ? `${Number(kpi.attendanceRate || 0).toFixed(2)}%` : "-"}
              </div>
            </div>
          </div>

          <div className="anNote">
            Status: <b>{kpi.attendanceStatus || "UPCOMING"}</b>
            <br />
            Attendance is counted only when the ticket is successfully scanned and stored in{" "}
            <b>attendance_logs</b>.
            {!isCompleted && (
              <>
                <br />
                Absent count will be shown only after the event is completed.
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
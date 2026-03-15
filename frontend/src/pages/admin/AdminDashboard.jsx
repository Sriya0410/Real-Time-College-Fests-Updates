import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../services/api";
import "../../styles/dashboard.css";

export default function AdminDashboard() {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [stats, setStats] = useState({
    totalEvents: 0,
    presentEvents: 0,
    totalRegistrations: 0,
    totalFoodOrders: 0,
  });

  const [recentRegs, setRecentRegs] = useState([]);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setErr("");

    try {
      const res = await api.get("/admin/dashboard");

      const statsFromApi = res.data?.data?.stats || {};
      const recentFromApi = res.data?.data?.recentRegistrations || [];

      setStats({
        totalEvents: Number(statsFromApi.totalEvents || 0),
        presentEvents: Number(statsFromApi.presentEvents || 0),
        totalRegistrations: Number(statsFromApi.totalRegistrations || 0),
        totalFoodOrders: Number(statsFromApi.totalFoodOrders || 0),
      });

      setRecentRegs(Array.isArray(recentFromApi) ? recentFromApi : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load dashboard");
      setStats({
        totalEvents: 0,
        presentEvents: 0,
        totalRegistrations: 0,
        totalFoodOrders: 0,
      });
      setRecentRegs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adminPage">
      {err && (
        <div style={{ marginBottom: 12, color: "salmon", fontWeight: 900 }}>
          {err}
        </div>
      )}

      {/* HERO */}
      <div className="adminHero">
        <div className="adminHeroText">
          <h1>Admin Control Center</h1>
          <p>Centralized management for events, registrations, food orders & updates.</p>

          <div className="adminHeroPill">
            <span className="adminHeroPillIcon">📅</span>
            <span>{today}</span>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="adminStats">
        <div className="adminStatCard">
          <div className="adminStatIcon">🎪</div>
          <div className="adminStatInfo">
            <div className="adminStatLabel">Total Events</div>
            <div className="adminStatValue">{loading ? "…" : stats.totalEvents}</div>
          </div>
        </div>

        <div className="adminStatCard">
          <div className="adminStatIcon">📌</div>
          <div className="adminStatInfo">
            <div className="adminStatLabel">Present Events</div>
            <div className="adminStatValue">{loading ? "…" : stats.presentEvents}</div>
          </div>
        </div>

        <div className="adminStatCard">
          <div className="adminStatIcon">👥</div>
          <div className="adminStatInfo">
            <div className="adminStatLabel">Registrations</div>
            <div className="adminStatValue">{loading ? "…" : stats.totalRegistrations}</div>
          </div>
        </div>

        <div className="adminStatCard">
          <div className="adminStatIcon">🛒</div>
          <div className="adminStatInfo">
            <div className="adminStatLabel">Food Orders</div>
            <div className="adminStatValue">{loading ? "…" : stats.totalFoodOrders}</div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS + RECENT */}
      <div className="adminRow">
        <div className="adminPanel">
          <div className="adminPanelHead">
            <h2>Quick Actions</h2>
            <span className="adminPanelMeta">4 actions</span>
          </div>

          <div className="adminActions">
            <div className="adminAction">
              <div className="adminActionLeft">
                <div className="adminActionIcon">➕</div>
                <div>
                  <div className="adminActionTitle">Create Event</div>
                  <div className="adminActionDesc">Create new campus event</div>
                </div>
              </div>
              <Link className="adminGoBtn" to="/admin/events/create">
                Go →
              </Link>
            </div>

            <div className="adminAction">
              <div className="adminActionLeft">
                <div className="adminActionIcon">📢</div>
                <div>
                  <div className="adminActionTitle">Announcements</div>
                  <div className="adminActionDesc">Post verified updates</div>
                </div>
              </div>
              <Link className="adminGoBtn" to="/admin/announcements">
                Go →
              </Link>
            </div>

            <div className="adminAction">
              <div className="adminActionLeft">
                <div className="adminActionIcon">🧾</div>
                <div>
                  <div className="adminActionTitle">Registrations</div>
                  <div className="adminActionDesc">View registrations</div>
                </div>
              </div>
              <Link className="adminGoBtn" to="/admin/registrations">
                Go →
              </Link>
            </div>

            {/* ✅ NEW: Analytics */}
            <div className="adminAction">
              <div className="adminActionLeft">
                <div className="adminActionIcon">📊</div>
                <div>
                  <div className="adminActionTitle">Analytics</div>
                  <div className="adminActionDesc">Attendance, revenue & expenses</div>
                </div>
              </div>
              <Link className="adminGoBtn" to="/admin/analytics">
                Go →
              </Link>
            </div>
          </div>
        </div>

        <div className="adminPanel">
          <div className="adminPanelHead">
            <h2>Recent Registrations</h2>
            <span className="adminPanelMeta">{loading ? "…" : `${recentRegs.length} shown`}</span>
          </div>

          {!loading && recentRegs.length === 0 ? (
            <div className="adminEmpty">
              <div className="adminEmptyIcon">📮</div>
              <div className="adminEmptyText">No registrations yet</div>
              <div className="adminEmptySub">Latest registrations will appear here.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {recentRegs.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: 14,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>
                    {r.student_name || r.full_name || "Student"}
                  </div>

                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    {r.event_title || r.event_name || "Event"} •{" "}
                    {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
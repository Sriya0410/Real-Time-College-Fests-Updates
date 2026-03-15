import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../styles/profile.css";

export default function StudentProfile() {
  const { logoutStudent, user } = useAuth();
  const mountedRef = useRef(true);

  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // ✅ DB-backed preferences
  const [prefs, setPrefs] = useState({
    announcements: true,
    liveUpdates: true,
    paymentReminders: false,
    emailAlerts: false,
  });

  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // ✅ REAL STATS (from backend)
  const [stats, setStats] = useState({
    registeredEvents: 0,
    totalPayments: 0,
    foodOrders: 0,
    tickets: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // change password states
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });

  // =========================
  // Password rules
  // =========================
  const passwordRules = useMemo(() => {
    const next = pwd.next || "";
    return {
      minLen: next.length >= 8,
      upper: /[A-Z]/.test(next),
      lower: /[a-z]/.test(next),
      number: /[0-9]/.test(next),
      special: /[^A-Za-z0-9]/.test(next),
      match: next.length > 0 && next === (pwd.confirm || ""),
    };
  }, [pwd.next, pwd.confirm]);

  const allValid =
    passwordRules.minLen &&
    passwordRules.upper &&
    passwordRules.lower &&
    passwordRules.number &&
    passwordRules.special &&
    passwordRules.match;

  // =========================
  // Mounted guard
  // =========================
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // =========================
  // Load Profile (DB)
  // =========================
  const loadProfile = async () => {
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const res = await api.get("/student/me");
      const data = res.data?.data;

      if (!data) throw new Error("Profile not found");

      localStorage.setItem("last_login", new Date().toLocaleString());

      if (mountedRef.current) setProfile(data);
    } catch (e) {
      if (mountedRef.current) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load profile");
        setProfile(null);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // =========================
  // ✅ Load Preferences (DB)  FIXED
  // =========================
  const loadPrefs = async () => {
    setPrefsLoading(true);
    try {
      const res = await api.get("/student/prefs");
      if (res.data?.ok && res.data?.data) {
        if (mountedRef.current) setPrefs(res.data.data);
      }
    } catch (e) {
      // keep defaults silently
    } finally {
      if (mountedRef.current) setPrefsLoading(false);
    }
  };

  // =========================
  // ✅ Load Stats (DB)
  // =========================
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get("/student/stats");
      if (res.data?.ok && res.data?.data) {
        if (mountedRef.current) setStats(res.data.data);
      }
    } catch (e) {
      // keep as 0 silently
    } finally {
      if (mountedRef.current) setStatsLoading(false);
    }
  };

  // load on mount
  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadPrefs();
    loadStats();
    // eslint-disable-next-line
  }, [user?.id]);

  // =========================
  // Save profile
  // =========================
  const validateProfile = () => {
    if (!profile?.full_name || String(profile.full_name).trim().length < 3)
      return "Name must be at least 3 characters.";
    if (profile?.phone && !/^[0-9]{10}$/.test(String(profile.phone).trim()))
      return "Phone must be 10 digits.";
    return "";
  };

  const saveProfile = async () => {
    const v = validateProfile();
    if (v) return setMsg(v);

    setSaving(true);
    setErr("");
    setMsg("");

    try {
      const payload = {
        full_name: String(profile.full_name || "").trim(),
        phone: profile.phone ? String(profile.phone).trim() : null,
        college: profile.college ? String(profile.college).trim() : null,
      };

      const res = await api.patch("/student/me", payload);
      if (!res.data?.ok) throw new Error(res.data?.message || "Failed to update profile");

      setMsg("Profile updated ✅");
      setEdit(false);
      await loadProfile();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // Auto-save preferences (debounced)
  // =========================
  useEffect(() => {
    if (!user) return;
    if (prefsLoading) return;

    const t = setTimeout(async () => {
      try {
        setPrefsSaving(true);
        const res = await api.patch("/student/prefs", prefs);
        if (!res.data?.ok) throw new Error(res.data?.message || "Failed to save preferences");
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Failed to save preferences");
      } finally {
        setPrefsSaving(false);
      }
    }, 500);

    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [prefs]);

  // =========================
  // Change password
  // =========================
  const changePassword = async () => {
    setErr("");
    setMsg("");

    if (!pwd.current) return setMsg("Current password is required");
    if (!allValid) return setMsg("Please meet all password rules");

    setPwdLoading(true);

    try {
      const res = await api.patch("/student/change-password", {
        currentPassword: pwd.current,
        newPassword: pwd.next,
      });

      if (!res.data?.ok) throw new Error(res.data?.message || "Password change failed");

      setMsg("Password changed ✅ Please login again.");
      logoutStudent();

      setPwd({ current: "", next: "", confirm: "" });
      setTimeout(() => (window.location.href = "/student/login"), 700);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Password change failed");
    } finally {
      setPwdLoading(false);
    }
  };

  // avatar initials
  const initials = useMemo(() => {
    const name = profile?.full_name || "Student";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }, [profile?.full_name]);

  const securityInfo = useMemo(() => {
    return {
      lastLogin: localStorage.getItem("last_login") || "—",
      joined: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—",
    };
  }, [profile?.created_at]);

  const doLogout = () => {
    logoutStudent();
    window.location.href = "/student/login";
  };

  // =========================
  // Render states
  // =========================
  if (!user) {
    return (
      <div className="page">
        <div className="pageHeader">
          <h1>My Profile</h1>
          <p>Please login again.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="pageHeader">
          <h1>My Profile</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <div className="pageHeader">
          <h1>My Profile</h1>
          <p>{err || "Failed to load profile"}</p>
          <button className="btnSmall" type="button" onClick={loadProfile}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>My Profile</h1>
      </div>

      {msg ? <div className="profileMsg">{msg}</div> : null}
      {err ? (
        <div className="profileMsg" style={{ borderColor: "rgba(239,68,68,.35)" }}>
          {err}
        </div>
      ) : null}

      {/* ================= HEADER CARD ================= */}
      <div className="card profileHero">
        <div className="profileHeroLeft">
          <div className="avatarCircle">{initials}</div>
          <div className="profileHeroMeta">
            <div className="profileName">{profile.full_name || "Student"}</div>
            <div className="profileEmail">{profile.email || "—"}</div>
          </div>
        </div>

        <div className="profileHeroRight">
          <button
            className="btnSmall"
            type="button"
            onClick={() => setEdit((s) => !s)}
            disabled={saving}
          >
            {edit ? "Cancel" : "Edit Profile"}
          </button>
        </div>
      </div>

      {/* ================= STATS (REAL) ================= */}
      <div className="profileStatsGrid">
        <div className="card statCard">
          <div className="statValue">{statsLoading ? "…" : stats.registeredEvents}</div>
          <div className="statLabel">Registered Events</div>
        </div>

        <div className="card statCard">
          <div className="statValue">{statsLoading ? "…" : stats.totalPayments}</div>
          <div className="statLabel">Total Payments</div>
        </div>

        <div className="card statCard">
          <div className="statValue">{statsLoading ? "…" : stats.foodOrders}</div>
          <div className="statLabel">Food Orders</div>
        </div>

        <div className="card statCard">
          <div className="statValue">{statsLoading ? "…" : stats.tickets}</div>
          <div className="statLabel">Tickets</div>
        </div>
      </div>

      {/* ================= BASIC INFO ================= */}
      <div className="card profileCard">
        <div className="profileHeaderRow">
          <h2>Basic Information</h2>
          <span className="pill">{edit ? "Editing" : "Read only"}</span>
        </div>

        <div className="profileGrid">
          <label>
            Full Name
            <input
              disabled={!edit}
              value={profile.full_name || ""}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Your name"
            />
          </label>

          <label>
            Email
            <input disabled value={profile.email || ""} />
          </label>

          <label>
            Phone
            <input
              disabled={!edit}
              value={profile.phone || ""}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              placeholder="10-digit phone"
            />
          </label>

          <label>
            College
            <input
              disabled={!edit}
              value={profile.college || ""}
              onChange={(e) => setProfile((p) => ({ ...p, college: e.target.value }))}
              placeholder="College name"
            />
          </label>
        </div>

        {edit && (
          <button className="profilePrimaryBtn" type="button" onClick={saveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      {/* ================= SECURITY INFO ================= */}
      <div className="card profileCard">
        <h2>Security</h2>
        <div className="securityGrid">
          <div className="securityItem">
            <div className="securityLabel">Last Login</div>
            <div className="securityValue">{securityInfo.lastLogin}</div>
          </div>
          <div className="securityItem">
            <div className="securityLabel">Joined</div>
            <div className="securityValue">{securityInfo.joined}</div>
          </div>
        </div>
      </div>

      {/* ================= CHANGE PASSWORD ================= */}
      <div className="card profileCard">
        <h2>Change Password</h2>
        <p className="profileHint">8+ chars, uppercase, lowercase, number, symbol.</p>

        <div className="profileGrid">
          <label>
            Current Password
            <div className="profileInputRow">
              <input
                type={showPwd.current ? "text" : "password"}
                value={pwd.current}
                onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                placeholder="Enter current password"
              />
              <button type="button" className="eyeBtn" onClick={() => setShowPwd((s) => ({ ...s, current: !s.current }))}>
                {showPwd.current ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label>
            New Password
            <div className="profileInputRow">
              <input
                type={showPwd.next ? "text" : "password"}
                value={pwd.next}
                onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                placeholder="Enter new password"
              />
              <button type="button" className="eyeBtn" onClick={() => setShowPwd((s) => ({ ...s, next: !s.next }))}>
                {showPwd.next ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label>
            Confirm Password
            <div className="profileInputRow">
              <input
                type={showPwd.confirm ? "text" : "password"}
                value={pwd.confirm}
                onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Re-enter new password"
              />
              <button type="button" className="eyeBtn" onClick={() => setShowPwd((s) => ({ ...s, confirm: !s.confirm }))}>
                {showPwd.confirm ? "Hide" : "Show"}
              </button>
            </div>
          </label>
        </div>

        <button
          className="profilePrimaryBtn"
          type="button"
          onClick={changePassword}
          disabled={!pwd.current || !allValid || pwdLoading}
          style={{ opacity: !pwd.current || !allValid || pwdLoading ? 0.6 : 1 }}
        >
          {pwdLoading ? "Updating..." : "Update Password"}
        </button>
      </div>

      {/* ================= LOGOUT (DOWN) ================= */}
      <div className="card profileCard dangerZone">
        <h2>Logout</h2>
        <p className="profileHint">You will be redirected to login.</p>
        <button className="dangerBtn" type="button" onClick={doLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="toggleRow">
      <div className="toggleMeta">
        <div className="toggleLabel">{label}</div>
        <div className="toggleDesc">{desc}</div>
      </div>

      <button
        type="button"
        className={`toggleBtn ${value ? "on" : "off"}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      >
        <span className="toggleKnob" />
      </button>
    </div>
  );
}
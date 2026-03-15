import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "../../styles/adminLostFoundPage.css";

export default function AdminLostFound() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ backend base for images
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const getImageSrc = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_BASE}${url}`; // /uploads/... -> http://localhost:5000/uploads/...
  };

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/admin/lostfound");
      setItems(res.data?.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load lost & found");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, next) => {
    setErr("");
    try {
      await api.patch(`/admin/lostfound/${id}/status`, { status: next });
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: next } : x)));
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to update status");
    }
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((x) => {
      const matchQ =
        !qq ||
        String(x.id).includes(qq) ||
        String(x.user_id || "").includes(qq) ||
        String(x.title || "").toLowerCase().includes(qq) ||
        String(x.location || "").toLowerCase().includes(qq) ||
        String(x.description || "").toLowerCase().includes(qq);

      const matchStatus =
        status === "ALL" || String(x.status || "lost").toUpperCase() === status;

      return matchQ && matchStatus;
    });
  }, [items, q, status]);

  return (
    <div className="adminLFPage">
      <div className="adminLFHeader">
        <div>
          <h1 className="adminLFTitle">Lost & Found</h1>
          <div className="adminLFSub">{loading ? "Loading..." : `${filtered.length} items`}</div>
        </div>

        <button className="btnSmall2" onClick={loadItems} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {err && <div className="adminMsg error">{err}</div>}

      <div className="adminLFFilters">
        <input
          className="adminInput"
          placeholder="Search id / title / location / user id..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select className="adminSelect" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="LOST">LOST</option>
          <option value="FOUND">FOUND</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      <div className="adminLFCard">
        <div className="adminLFTable">
          <div className="th">Item</div>
          <div className="th">Location</div>
          <div className="th">User</div>
          <div className="th">Status</div>
          <div className="th">Action</div>

          {filtered.map((it) => {
            const st = String(it.status || "lost").toUpperCase();
            const imgSrc = it.image_url ? getImageSrc(it.image_url) : "";

            return (
              <div className="tr" key={it.id}>
                <div className="td">
                  <div className="strong">#{it.id} • {it.title}</div>
                  <div className="mutedLine">
                    {it.created_at ? new Date(it.created_at).toLocaleString() : "-"}
                  </div>

                  {/* ✅ IMAGE (Admin) */}
                  {imgSrc && (
                    <img
                      className="lfImg"
                      src={imgSrc}
                      alt={it.title}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}

                  {it.description && <div className="descLine">{it.description}</div>}
                </div>

                <div className="td">
                  <div className="strong">{it.location || "—"}</div>
                </div>

                <div className="td">
                  <div className="strong">User #{it.user_id}</div>
                </div>

                <div className="td">
                  <span className={`lfStatus lf-${st.toLowerCase()}`}>{st}</span>
                </div>

                <div className="td actions">
                  <select
                    className="miniSelect"
                    value={st}
                    onChange={(e) => updateStatus(it.id, e.target.value.toLowerCase())}
                  >
                    <option value="LOST">LOST</option>
                    <option value="FOUND">FOUND</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>
            );
          })}

          {!loading && filtered.length === 0 && <div className="adminEmpty2">No items found.</div>}
        </div>
      </div>
    </div>
  );
}
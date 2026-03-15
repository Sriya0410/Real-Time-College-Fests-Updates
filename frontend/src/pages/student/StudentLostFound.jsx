import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "../../styles/lostFound.css";
import { fileUrl } from "../../utils/fileUrl";

export default function StudentLostFound() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [view, setView] = useState("ALL"); // ALL | MY

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const loadItems = async () => {
    setLoading(true);
    setErr("");
    try {
      const endpoint = view === "MY" ? "/lostfound/my" : "/lostfound";
      const res = await api.get(endpoint);
      setItems(res.data?.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load items");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;

    return items.filter((x) => {
      const t = String(x.title || "").toLowerCase();
      const d = String(x.description || "").toLowerCase();
      const l = String(x.location || "").toLowerCase();
      return t.includes(qq) || d.includes(qq) || l.includes(qq);
    });
  }, [items, q]);

  const statusLabel = (s) => String(s || "lost").toUpperCase();
  const statusClass = (s) => String(s || "lost").toLowerCase();

  return (
    <div className="lostPage">
      <div className="lostHeader">
        <div>
          <h1>Lost & Found</h1>
          <p className="lostSub">Find or report lost items on campus</p>
        </div>

        <Link to="/student/lostfound/report" className="primaryBtn">
          + Report Item
        </Link>
      </div>

      {err && <div className="lostMsg error">{err}</div>}

      <div className="lostFilters">
        <input
          className="lostSearch"
          placeholder="Search items..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="lostFilterRight">
          <select
            className="lostSelect"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="ALL">All Items</option>
            <option value="MY">My Reports</option>
          </select>

          <button
            className="lostRefreshBtn"
            onClick={loadItems}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading && <div className="card">Loading items...</div>}
      {!loading && !filtered.length && <div className="card">No items found.</div>}

      <div className="lostGrid">
        {filtered.map((it) => (
          <div key={it.id} className="lostCard">
            <div className="lostCardTop">
              <div className="lostTitle">{it.title}</div>
              <span className={`lostStatus ${statusClass(it.status)}`}>
                {statusLabel(it.status)}
              </span>
            </div>

            {it.image_url && (
              <img
                className="lostImg"
                src={fileUrl(it.image_url)}
                alt={it.title}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}

            <div className="lostDesc">{it.description || "—"}</div>

            <div className="lostMeta">
              <span>{it.location || "Unknown location"}</span>
              <span className="dot" />
              <span>
                {it.created_at
                  ? new Date(it.created_at).toLocaleDateString()
                  : "-"}
              </span>
            </div>

            {view === "MY" && (
              <div className="lostActions">
                <Link
                  className="btnSmall2 btnLink"
                  to={`/student/lostfound/receipt/${it.id}`}
                >
                  Receipt
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
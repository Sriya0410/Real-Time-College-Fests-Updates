import { useEffect, useState } from "react";
import { fetchAnnouncements } from "../../services/announcementService";
import { useSocket } from "../../context/SocketContext";
import "../../styles/updates.css";

export default function StudentAnnouncements() {
  // ✅ FIX: destructure
  const { socket, connected } = useSocket();

  const [list, setList] = useState([]);

  const load = async () => {
    const data = await fetchAnnouncements();
    setList(data);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket || !connected) return;

    const onNew = (a) => {
      if (a?.is_active === 1) setList((p) => [a, ...p]);
    };

    socket.on("announcement:new", onNew);
    return () => socket.off("announcement:new", onNew);
  }, [socket, connected]);

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Announcements</h1>
      </div>

      <div className="stack">
        {list.map((a) => (
          <div key={a.id} className="card updateCard">
            <div className="row">
              <span className={`tag tag-${String(a.priority || "").toLowerCase()}`}>
                {a.priority}
              </span>
              <span className="muted">{new Date(a.created_at).toLocaleString()}</span>
            </div>
            <h3>{a.title}</h3>
            <p>{a.message}</p>
          </div>
        ))}
        {!list.length && <div className="card">No announcements yet.</div>}
      </div>
    </div>
  );
}
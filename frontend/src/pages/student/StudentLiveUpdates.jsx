import { useEffect, useState } from "react";
import { fetchLiveUpdates } from "../../services/liveUpdateService";
import { useSocket } from "../../context/SocketContext";
import "../../styles/updates.css";

export default function StudentLiveUpdates() {
  // ✅ FIX: destructure
  const { socket, connected } = useSocket();

  const [list, setList] = useState([]);

  const load = async () => {
    const data = await fetchLiveUpdates();
    setList(data);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket || !connected) return;

    const onNew = (u) => setList((p) => [u, ...p]);

    socket.on("live:update:new", onNew);
    return () => socket.off("live:update:new", onNew);
  }, [socket, connected]);

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Live Updates</h1>
      </div>

      <div className="stack">
        {list.map((u) => (
          <div key={u.id} className="card updateCard">
            <div className="row">
              <span className={`tag tag-${String(u.type || "").toLowerCase()}`}>
                {u.type}
              </span>
              <span className="muted">{new Date(u.created_at).toLocaleString()}</span>
            </div>
            <h3>{u.title}</h3>
            <p>{u.message}</p>
          </div>
        ))}
        {!list.length && <div className="card">No live updates yet.</div>}
      </div>
    </div>
  );
}
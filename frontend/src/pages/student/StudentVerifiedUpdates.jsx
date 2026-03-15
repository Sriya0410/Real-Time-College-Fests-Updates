import { useEffect, useState } from "react";
import { fetchVerifiedUpdates } from "../../services/verifiedUpdateService";
import { useSocket } from "../../context/SocketContext";
import "../../styles/updates.css";

export default function StudentVerifiedUpdates() {
  const { socket } = useSocket();
  const [list, setList] = useState([]);

  const load = async () => {
    const data = await fetchVerifiedUpdates({ active: 1 });
    setList(data);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onNew = (u) => setList((p) => [u, ...p]);

    socket.on("verified:update:new", onNew);
    return () => socket.off("verified:update:new", onNew);
  }, [socket]);

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Verified Updates</h1>
        <p className="muted">
          Only these updates are official. Do not trust WhatsApp/Instagram forwards without verification.
        </p>
      </div>

      <div className="stack">
        {list.map((u) => (
          <div key={u.id} className="card updateCard">
            <div className="row">
              <span className={`tag tag-${String(u.severity || "INFO").toLowerCase()}`}>
                {u.severity}
              </span>
              <span className="muted">{new Date(u.created_at).toLocaleString()}</span>
            </div>

            <h3> {u.title}</h3>
            <p>{u.message}</p>

            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Posted by: {u.created_by_name || "Admin"}</span>
              <span className="muted">
                Code: <b>{u.verification_code}</b>
              </span>
            </div>
          </div>
        ))}

        {!list.length && <div className="card">No verified updates yet.</div>}
      </div>
    </div>
  );
}
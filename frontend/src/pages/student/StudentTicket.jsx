import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "../../styles/studentTicket.css";

export default function StudentTicket() {
  const { registrationId } = useParams();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function loadTicket() {
      try {
        const res = await fetch(
          `http://localhost:5000/api/registrations/${registrationId}/ticket`,
          { credentials: "include" }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load ticket");

        setTicket(data);
      } catch (e) {
        console.error(e);
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [registrationId]);

  if (loading) return <div className="ticketPage">Loading ticket...</div>;
  if (err) return <div className="ticketPage">{err}</div>;
  if (!ticket) return null;

  return (
    <div className="ticketPage">
      <h1 className="ticketTitle">🎫 Event Ticket</h1>

      <div className="ticketCard">
        <div className="ticketRow"><b>Event:</b> {ticket.title}</div>
        <div className="ticketRow"><b>Name:</b> {ticket.name}</div>
        <div className="ticketRow"><b>Reg No:</b> {ticket.reg_no}</div>
        <div className="ticketRow"><b>Branch:</b> {ticket.branch}</div>
        <div className="ticketRow"><b>Year:</b> {ticket.year}</div>
        <div className="ticketRow"><b>Status:</b> {ticket.status}</div>
      </div>
    </div>
  );
}
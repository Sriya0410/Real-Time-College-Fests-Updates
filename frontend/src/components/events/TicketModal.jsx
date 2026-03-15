import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./TicketModal.css";

const API = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

function formatDatePretty(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}
function formatTimePretty(value) {
  if (!value) return "-";
  return String(value).slice(0, 5);
}

export default function TicketModal({ open, onClose, registrationId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const ticketRef = useRef(null);

  useEffect(() => {
    if (!open || !registrationId) return;

    const load = async () => {
      setLoading(true);
      setErr("");
      setData(null);

      try {
        const res = await fetch(`${API}/registrations/${registrationId}/ticket`, {
          credentials: "include",
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to load ticket");
        setData(json);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, registrationId]);

  async function downloadPDF() {
    if (!ticketRef.current) return;

    const canvas = await html2canvas(ticketRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    pdf.save(`EventVerse-Ticket-${data?.ticketCode || registrationId}.pdf`);
  }

  if (!open) return null;

  const verifyUrl = data?.verifyUrl || null;

  return (
    <div className="tBack" onClick={onClose}>
      <div className="tCard" onClick={(e) => e.stopPropagation()}>
        <div className="tHead">
          <div className="tTitle">Your Ticket</div>
          <button className="tClose" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading && <div className="tMsg">Loading...</div>}
        {err && <div className="tErr">{err}</div>}

        {data && (
          <>
            <div className="tTicket" ref={ticketRef}>
              <div className="tBrand">EventVerse</div>
              <div className="tEvent">{data.event.title}</div>

              <div className="tRows">
                <div>
                  <b>Date:</b> {formatDatePretty(data.event.event_date)}
                </div>
                <div>
                  <b>Time:</b> {formatTimePretty(data.event.start_time)}{" "}
                  {data.event.end_time ? `- ${formatTimePretty(data.event.end_time)}` : ""}
                </div>
                <div>
                  <b>Venue:</b> {data.event.venue}
                </div>
                <div>
                  <b>Ticket Code:</b> {data.ticketCode}
                </div>
              </div>

              <div className="tQRWrap">
                <img className="tQR" src={data.qrDataUrl} alt="QR Ticket" />
                <div className="tSmall">Scan this QR at entry</div>

                {verifyUrl ? (
                  <a
                    href={verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginTop: 8, display: "inline-block", fontWeight: 800 }}
                  >
                    Open Verification Page
                  </a>
                ) : null}
              </div>
            </div>

            <div className="tActions">
              <button className="tBtn ghost" onClick={onClose}>
                Close
              </button>
              <button className="tBtn" onClick={downloadPDF}>
                Download PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
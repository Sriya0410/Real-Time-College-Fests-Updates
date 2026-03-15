import { useEffect, useMemo, useState } from "react";
import CertificateCard from "../../components/certificates/CertificateCard";
import certificateApi from "../../services/certificateApi";
import "../../styles/studentCertificates.css";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function StudentCertificates() {
  const [dashboard, setDashboard] = useState({
    generatedCertificates: [],
    registrations: [],
    generatedEventIds: [],
    eligibility: {},
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openingEventId, setOpeningEventId] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setErr("");

    try {
      const res = await certificateApi.getDashboard();
      setDashboard(
        res.data?.data || {
          generatedCertificates: [],
          registrations: [],
          generatedEventIds: [],
          eligibility: {},
        }
      );
    } catch (e) {
      console.error("certificate dashboard error:", e);
      setErr(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Failed to load certificates."
      );
    } finally {
      setLoading(false);
    }
  }

  function openCertificate(eventId) {
    setOpeningEventId(eventId);

    const url = certificateApi.openCertificateUrl(eventId);
    window.open(url, "_blank");

    setTimeout(() => {
      setOpeningEventId(null);
      loadDashboard();
    }, 1200);
  }

  const { generatedCertificates, registrations, generatedEventIds, eligibility } =
    dashboard;

  // ✅ show only completed events in eligibility section
  const completedRegistrations = useMemo(() => {
    return (registrations || []).filter((reg) => {
      const status = String(reg?.event_status || reg?.status || "")
        .trim()
        .toUpperCase();

      return status === "COMPLETED";
    });
  }, [registrations]);

  if (loading) {
    return (
      <div className="certPage">
        <h1 className="certTitle">Digital Certificates</h1>
        <p className="certMuted">Loading certificates...</p>
      </div>
    );
  }

  return (
    <div className="certPage">
      <div className="certHead">
        <div>
          <h1 className="certTitle">Digital Certificates</h1>
          <p className="certSub">
            Download certificates for attended and completed events.
          </p>
        </div>
      </div>

      {err ? <div className="certError">{err}</div> : null}

      <section className="certSection">
        <h2 className="certSectionTitle">Generated Certificates</h2>

        {!generatedCertificates.length ? (
          <div className="certEmpty">No certificates generated yet.</div>
        ) : (
          <div className="certGrid">
            {generatedCertificates.map((item) => (
              <CertificateCard
                key={item.id}
                title={item.event_title}
                subtitle={`Certificate No: ${item.certificate_no}`}
                badge="Generated"
                badgeClass="done"
                details={[
                  { label: "Name", value: item.certificate_name },
                  { label: "Event Date", value: formatDate(item.event_date) },
                  { label: "Venue", value: item.venue || "-" },
                  { label: "Issued At", value: formatDate(item.issued_at) },
                ]}
                buttonText={
                  openingEventId === item.event_id ? "Opening..." : "Open Certificate"
                }
                onClick={() => openCertificate(item.event_id)}
                disabled={openingEventId === item.event_id}
              />
            ))}
          </div>
        )}
      </section>

      <section className="certSection">
        <h2 className="certSectionTitle">Eligibility Status</h2>

        {!completedRegistrations.length ? (
          <div className="certEmpty">No completed events found.</div>
        ) : (
          <div className="certGrid">
            {completedRegistrations.map((reg) => {
              const eventId = Number(reg.event_id);
              const alreadyGenerated = generatedEventIds.includes(eventId);
              const el = eligibility[eventId] || {};
              const eligible = !!el.eligible;

              let badge = "Not Eligible";
              let badgeClass = "wait";

              if (alreadyGenerated) {
                badge = "Already Generated";
                badgeClass = "done";
              } else if (eligible) {
                badge = "Eligible";
                badgeClass = "ok";
              }

              return (
                <CertificateCard
                  key={reg.id}
                  title={reg.event_title || `Event #${eventId}`}
                  subtitle={`Registration Status: ${reg.status || "-"}`}
                  badge={badge}
                  badgeClass={badgeClass}
                  details={[
                    { label: "Event Date", value: formatDate(reg.event_date) },
                    { label: "Venue", value: reg.venue || "-" },
                    {
                      label: "Status",
                      value: alreadyGenerated
                        ? "Certificate already available."
                        : el.reason || "Eligibility not checked.",
                    },
                  ]}
                  buttonText={
                    alreadyGenerated || eligible
                      ? openingEventId === eventId
                        ? "Opening..."
                        : "Download Certificate"
                      : "Not Available"
                  }
                  onClick={() => openCertificate(eventId)}
                  disabled={!(alreadyGenerated || eligible) || openingEventId === eventId}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
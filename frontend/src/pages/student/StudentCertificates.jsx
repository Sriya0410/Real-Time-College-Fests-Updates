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

function isCompletedEvent(reg) {
  const eventStatus = String(reg?.event_status || "")
    .trim()
    .toUpperCase();

  if (eventStatus === "COMPLETED") return true;

  const eventDate = new Date(reg?.event_date);

  if (Number.isNaN(eventDate.getTime())) return false;

  return eventDate <= new Date();
}

function makeSafeFileName(title) {
  return String(title || "certificate")
    .trim()
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
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
  const [downloadingEventId, setDownloadingEventId] = useState(null);

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
          e?.message ||
          "Failed to load certificates."
      );
    } finally {
      setLoading(false);
    }
  }

  async function openCertificate(eventId) {
    try {
      setOpeningEventId(eventId);
      setErr("");

      await certificateApi.openCertificate(eventId);

      setTimeout(() => {
        loadDashboard();
      }, 1000);
    } catch (e) {
      console.error("open certificate error:", e);

      setErr(
        e?.message ||
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Certificate not generated. Please check attendance and eligibility."
      );
    } finally {
      setOpeningEventId(null);
    }
  }

  async function downloadCertificate(eventId, eventTitle) {
    try {
      setDownloadingEventId(eventId);
      setErr("");

      const safeTitle = makeSafeFileName(eventTitle);

      await certificateApi.downloadCertificate(
        eventId,
        `${safeTitle}-certificate.pdf`
      );

      setTimeout(() => {
        loadDashboard();
      }, 1000);
    } catch (e) {
      console.error("download certificate error:", e);

      setErr(
        e?.message ||
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Certificate download failed."
      );
    } finally {
      setDownloadingEventId(null);
    }
  }

  const {
    generatedCertificates,
    registrations,
    generatedEventIds,
    eligibility,
  } = dashboard;

  const completedRegistrations = useMemo(() => {
    return (registrations || []).filter((reg) => {
      const category = String(reg?.category_name || "")
        .trim()
        .toUpperCase();

      return isCompletedEvent(reg) && category !== "PROSHOWS";
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
            View, open, and download your certificates for attended events.
          </p>
        </div>

        <button className="certRefreshBtn" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      {err ? <div className="certError">{err}</div> : null}

      <section className="certSection">
        <h2 className="certSectionTitle">My Certificates</h2>

        {!completedRegistrations.length ? (
          <div className="certEmpty">No certificates available yet.</div>
        ) : (
          <div className="certGrid">
            {completedRegistrations.map((reg) => {
              const eventId = Number(reg.event_id);

              const generatedCert = generatedCertificates.find(
                (item) => Number(item.event_id) === eventId
              );

              const alreadyGenerated =
                !!generatedCert ||
                generatedEventIds.map(Number).includes(eventId);

              const el = eligibility[eventId] || {};
              const eligible = !!el.eligible;

              let badge = "Not Available";
              let badgeClass = "wait";

              if (alreadyGenerated) {
                badge = "Generated";
                badgeClass = "done";
              } else if (eligible) {
                badge = "Eligible";
                badgeClass = "ok";
              }

              const canOpenOrDownload = alreadyGenerated || eligible;

              const isOpening = openingEventId === eventId;
              const isDownloading = downloadingEventId === eventId;

              const eventTitle =
                reg.event_title ||
                generatedCert?.event_title ||
                `Event ${eventId}`;

              return (
                <CertificateCard
                  key={reg.id}
                  title={eventTitle}
                  subtitle={
                    alreadyGenerated && generatedCert?.certificate_no
                      ? `Certificate No: ${generatedCert.certificate_no}`
                      : `Registration Status: ${reg.status || "-"}`
                  }
                  badge={badge}
                  badgeClass={badgeClass}
                  details={[
                    {
                      label: "Name",
                      value:
                        generatedCert?.certificate_name ||
                        reg.full_name ||
                        "-",
                    },
                    {
                      label: "Event Date",
                      value: formatDate(reg.event_date),
                    },
                    {
                      label: "Venue",
                      value: reg.venue || "-",
                    },
                    {
                      label: "Status",
                      value: alreadyGenerated
                        ? "Certificate already generated."
                        : el.reason || "Certificate not available yet.",
                    },
                  ]}
                  buttonText={
                    !canOpenOrDownload
                      ? "Not Available"
                      : isOpening
                      ? "Opening..."
                      : "Open"
                  }
                  downloadText={isDownloading ? "Downloading..." : "Download"}
                  onClick={() => openCertificate(eventId)}
                  disabled={!canOpenOrDownload || isOpening || isDownloading}
                  onDownload={() => downloadCertificate(eventId, eventTitle)}
                  downloadDisabled={
                    !canOpenOrDownload || isOpening || isDownloading
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
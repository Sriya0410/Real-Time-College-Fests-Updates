import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../../services/api";
import "../../styles/adminCheckin.css";

function playBeep(type = "success") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = type === "success" ? 880 : 260;
    gain.gain.value = 0.08;

    osc.start();
    osc.stop(ctx.currentTime + (type === "success" ? 0.12 : 0.22));
  } catch {}
}

export default function AdminCheckin() {
  const qrRef = useRef(null);
  const fileInputRef = useRef(null);
  const lockRef = useRef(false);

  const [scannerReady, setScannerReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [busy, setBusy] = useState(false);

  const [status, setStatus] = useState("READY"); // READY | SUCCESS | ERROR
  const [message, setMessage] = useState("Scanner is ready.");
  const [lastScanAt, setLastScanAt] = useState("");
  const [student, setStudent] = useState(null);

  const submitCheckin = async (decodedText) => {
    if (!decodedText || lockRef.current) return;

    lockRef.current = true;
    setBusy(true);
    setStatus("READY");
    setMessage("Processing ticket...");
    setStudent(null);

    try {
      let lat = 0;
      let lng = 0;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {}
      }

      const res = await api.post("/registrations/checkin", {
        token: decodedText,
        lat,
        lng,
      });

      setStatus("SUCCESS");
      setMessage(res.data?.message || "Attendance marked successfully");
      setStudent(res.data?.data || null);
      setLastScanAt(new Date().toLocaleString());
      playBeep("success");
    } catch (e) {
      setStatus("ERROR");
      setMessage(e?.response?.data?.message || "Check-in failed");
      setStudent(e?.response?.data?.data || null);
      setLastScanAt(new Date().toLocaleString());
      playBeep("error");
    } finally {
      setBusy(false);
      setTimeout(() => {
        lockRef.current = false;
      }, 1500);
    }
  };

  useEffect(() => {
    const instance = new Html5Qrcode("qr-reader");
    qrRef.current = instance;
    setScannerReady(true);

    return () => {
      const cleanup = async () => {
        try {
          if (instance && instance.isScanning) {
            await instance.stop();
          }
        } catch {}
        try {
          await instance.clear();
        } catch {}
      };
      cleanup();
    };
  }, []);

  const startScanner = async () => {
    if (!qrRef.current || isScanning) return;

    try {
      setMessage("Starting camera...");
      setStatus("READY");

      await qrRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          await submitCheckin(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
      setMessage("Camera started. Scan a QR ticket.");
    } catch (e) {
      setStatus("ERROR");
      setMessage("Unable to start camera scanner.");
    }
  };

  const stopScanner = async () => {
    if (!qrRef.current || !isScanning) return;

    try {
      await qrRef.current.stop();
      setIsScanning(false);
      setMessage("Scanner stopped.");
      setStatus("READY");
    } catch {
      setStatus("ERROR");
      setMessage("Unable to stop scanner cleanly.");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !qrRef.current) return;

    try {
      setBusy(true);
      setStatus("READY");
      setMessage("Reading QR from image...");
      setStudent(null);

      const decodedText = await qrRef.current.scanFile(file, true);
      await submitCheckin(decodedText);
    } catch {
      setStatus("ERROR");
      setMessage("Could not detect a valid QR code in the image.");
      setStudent(null);
      playBeep("error");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="checkinPage">
      <div className="checkinWrap">
        <div className="checkinTop">
          <div>
            <h1 className="checkinTitle">QR Ticket Check-In</h1>
            <p className="checkinSub">
  Scan student event tickets or upload a QR image to mark attendance.
  Check-in is allowed only within the event time window configured by admin.
</p>
          </div>

          <div className={`scanBadge ${busy || isScanning ? "busy" : "ready"}`}>
            {busy ? "Processing..." : isScanning ? "Camera On" : "Ready"}
          </div>
        </div>

        <div className="checkinGrid">
          <div className="checkinCard scannerCard">
            <div className="cardHead">
              <h3>Scanner</h3>
              <span>Camera-based QR check-in</span>
            </div>

            <div className="scannerActions">
              <button
                type="button"
                className="checkinBtn primary"
                onClick={startScanner}
                disabled={!scannerReady || isScanning || busy}
              >
                Start Scanning
              </button>

              <button
                type="button"
                className="checkinBtn secondary"
                onClick={stopScanner}
                disabled={!isScanning}
              >
                Stop Scanning
              </button>

              <button
                type="button"
                className="checkinBtn upload"
                onClick={handleUploadClick}
                disabled={busy}
              >
                Upload QR Image
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                hidden
              />
            </div>

            <div id="qr-reader" className="qrReaderBox" />
          </div>

          <div className="checkinCard resultCard">
            <div className="cardHead">
              <h3>Last Scan Result</h3>
              <span>{lastScanAt || "No scan yet"}</span>
            </div>

            <div
              className={`resultBanner ${
                status === "SUCCESS"
                  ? "success"
                  : status === "ERROR"
                  ? "error"
                  : "neutral"
              }`}
            >
              <div className="resultIcon">
                {status === "SUCCESS" ? "✅" : status === "ERROR" ? "❌" : "📷"}
              </div>

              <div>
                <div className="resultTitle">
                  {status === "SUCCESS"
                    ? "Check-in Successful"
                    : status === "ERROR"
                    ? "Check-in Failed"
                    : "Waiting for scan"}
                </div>
                <div className="resultText">{message}</div>
              </div>
            </div>

            <div className="studentCard">
              <div className="studentHead">Student / Ticket Details</div>

              {!student ? (
                <div className="emptyState">
                  No ticket details yet. Use camera scan or upload a QR image.
                </div>
              ) : (
                <div className="studentGrid">
                  <div className="detailBox">
                    <span>Registration ID</span>
                    <strong>{student.registrationId || "-"}</strong>
                  </div>

                  <div className="detailBox">
                    <span>Event ID</span>
                    <strong>{student.eventId || "-"}</strong>
                  </div>

                  <div className="detailBox">
                    <span>User ID</span>
                    <strong>{student.userId || "-"}</strong>
                  </div>

                  <div className="detailBox">
                    <span>Ticket Code</span>
                    <strong>{student.ticketCode || "-"}</strong>
                  </div>

                  <div className="detailBox full">
                    <span>Student Name</span>
                    <strong>{student.full_name || "-"}</strong>
                  </div>

                  <div className="detailBox">
                    <span>Register No</span>
                    <strong>{student.reg_no || "-"}</strong>
                  </div>

                  <div className="detailBox">
                    <span>Branch</span>
                    <strong>{student.branch || "-"}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="scanTips">
              <div className="tipsHead">Tips</div>
              <ul>
                <li>Login as Admin, Student Affairs, or Volunteer before check-in.</li>
                <li>Use camera for live scan or upload a screenshot/photo of QR.</li>
                <li>Only approved tickets can be checked in.</li>
                <li>Already scanned tickets will show an error.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
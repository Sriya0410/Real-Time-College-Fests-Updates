const pool = require("../config/db");
const puppeteer = require("puppeteer");

const {
  getEligibility,
  createCertificateIfNeeded,
  listMyCertificates,
  listMyRegistrationsWithEvents,
  formatDateIN,
} = require("../services/certificateService");

const { generateCertificateHtml } = require("../utils/certificateGenerator");

function getBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function safeFileName(value) {
  return String(value || "certificate")
    .trim()
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function buildCertificateHtmlForUser(req, userId, eventId) {
  const eligibility = await getEligibility(userId, eventId);

  if (!eligibility.eligible) {
    const err = new Error(eligibility.reason);
    err.statusCode = 400;
    throw err;
  }

  const certificate = await createCertificateIfNeeded({
    userId,
    eventId,
    registrationId: eligibility.registration.id,
    certificateName: eligibility.user.full_name,
  });

  if (!certificate || !certificate.certificate_no) {
    const err = new Error("Certificate record was not created properly.");
    err.statusCode = 500;
    throw err;
  }

  const baseUrl = getBaseUrl(req);
  const verifyUrl = `${baseUrl}/api/certificates/verify/${certificate.certificate_no}`;

  const html = await generateCertificateHtml({
    userName: eligibility.user.full_name,
    eventTitle: eligibility.event.title,
    eventDate: formatDateIN(eligibility.event.event_date),
    venue: eligibility.event.venue,
    certificateNo: certificate.certificate_no,
    issuedAt: formatDateIN(certificate.issued_at || new Date()),
    verifyUrl,
    baseUrl,
  });

  return {
    html,
    certificate,
    eligibility,
  };
}

exports.getMyCertificates = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized",
      });
    }

    const data = await listMyCertificates(userId);

    return res.json({
      ok: true,
      data,
    });
  } catch (e) {
    console.error("getMyCertificates error:", e);

    return res.status(500).json({
      ok: false,
      message: "Failed to load certificates.",
      error: e.message,
    });
  }
};

exports.getMyCertificateDashboard = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized",
      });
    }

    const generatedCertificates = await listMyCertificates(userId);
    const registrations = await listMyRegistrationsWithEvents(userId);

    const generatedEventIdSet = new Set(
      generatedCertificates.map((item) => Number(item.event_id))
    );

    const eligibility = {};

    for (const reg of registrations) {
      try {
        const result = await getEligibility(userId, Number(reg.event_id));

        eligibility[reg.event_id] = {
          eligible: result.eligible,
          reason: result.reason,
          existingCertificate: result.existingCertificate || null,
        };
      } catch (e) {
        console.error(`eligibility error for event ${reg.event_id}:`, e);

        eligibility[reg.event_id] = {
          eligible: false,
          reason: e.message || "Eligibility check failed for this event.",
          existingCertificate: null,
        };
      }
    }

    return res.json({
      ok: true,
      data: {
        generatedCertificates,
        registrations,
        generatedEventIds: Array.from(generatedEventIdSet),
        eligibility,
      },
    });
  } catch (e) {
    console.error("getMyCertificateDashboard error:", e);

    return res.status(500).json({
      ok: false,
      message: "Failed to load certificate dashboard.",
      error: e.message,
    });
  }
};

exports.checkEligibility = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const eventId = Number(req.params.eventId);

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized",
      });
    }

    if (!eventId) {
      return res.status(400).json({
        ok: false,
        message: "Invalid event id.",
      });
    }

    const result = await getEligibility(userId, eventId);

    return res.json({
      ok: true,
      eligible: result.eligible,
      reason: result.reason,
      existingCertificate: result.existingCertificate || null,
      event: result.event || null,
    });
  } catch (e) {
    console.error("checkEligibility error:", e);

    return res.status(500).json({
      ok: false,
      message: "Failed to check certificate eligibility.",
      error: e.message,
    });
  }
};

exports.downloadCertificate = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const eventId = Number(req.params.eventId);

    console.log("Certificate open request:", {
      userId,
      eventId,
    });

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized",
      });
    }

    if (!eventId) {
      return res.status(400).json({
        ok: false,
        message: "Invalid event id.",
      });
    }

    const { html } = await buildCertificateHtmlForUser(req, userId, eventId);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="certificate-${eventId}-${userId}.html"`
    );

    return res.status(200).send(html);
  } catch (e) {
    console.error("downloadCertificate error:", e);

    return res.status(e.statusCode || 500).json({
      ok: false,
      message: e.message || "Failed to generate certificate.",
    });
  }
};

exports.downloadCertificatePdf = async (req, res) => {
  let browser = null;

  try {
    const userId = Number(req.user?.id);
    const eventId = Number(req.params.eventId);

    console.log("Certificate PDF download request:", {
      userId,
      eventId,
    });

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized",
      });
    }

    if (!eventId) {
      return res.status(400).json({
        ok: false,
        message: "Invalid event id.",
      });
    }

    const { html, certificate, eligibility } = await buildCertificateHtmlForUser(
      req,
      userId,
      eventId
    );

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    // ✅ Prevent timeout
    page.setDefaultNavigationTimeout(0);
    page.setDefaultTimeout(0);

    await page.setViewport({
      width: 1600,
      height: 1060,
      deviceScaleFactor: 1,
    });

    // ✅ Use domcontentloaded instead of networkidle0
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 0,
    });

    // ✅ Wait for images, but don't block forever
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);

      await Promise.all(
        imgs.map((img) => {
          if (img.complete) return Promise.resolve();

          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 2000);
          });
        })
      );
    });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      width: "1600px",
      height: "1060px",
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
      preferCSSPageSize: false,
    });

    const eventTitle = safeFileName(eligibility.event.title);
    const certNo = safeFileName(certificate.certificate_no);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${eventTitle}-${certNo}.pdf"`
    );

    return res.status(200).send(pdfBuffer);
  } catch (e) {
    console.error("downloadCertificatePdf error:", e);

    return res.status(e.statusCode || 500).json({
      ok: false,
      message: e.message || "Failed to download certificate PDF.",
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

exports.verifyCertificate = async (req, res) => {
  try {
    const certificateNo = String(req.params.certificateNo || "").trim();

    if (!certificateNo) {
      return res.status(400).json({
        ok: false,
        message: "Invalid certificate number.",
      });
    }

    const [rows] = await pool.query(
      `SELECT
          c.id,
          c.certificate_no,
          c.certificate_name,
          c.issued_at,
          e.title AS event_title,
          e.event_date,
          e.venue,
          u.full_name AS user_name
       FROM certificates c
       INNER JOIN events e ON e.id = c.event_id
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.certificate_no = ?
       LIMIT 1`,
      [certificateNo]
    );

    if (!rows.length) {
      return res.status(404).send(`
        <html>
          <head><title>Certificate Verification</title></head>
          <body style="font-family:Arial;padding:40px;">
            <h2>Certificate Not Found</h2>
            <p>The certificate number is invalid or does not exist.</p>
          </body>
        </html>
      `);
    }

    const item = rows[0];

    return res.send(`
      <html>
        <head>
          <title>Certificate Verification</title>
          <style>
            body { font-family: Arial, sans-serif; background:#f8fafc; padding:40px; }
            .card {
              max-width:720px; margin:0 auto; background:#fff; padding:28px;
              border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.08);
              border:1px solid #e2e8f0;
            }
            .ok { color:#166534; font-size:24px; font-weight:800; margin-bottom:14px; }
            .row { margin:10px 0; color:#334155; font-size:16px; }
            .label { font-weight:700; color:#0f172a; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="ok">Certificate Verified</div>
            <div class="row"><span class="label">Certificate No:</span> ${item.certificate_no}</div>
            <div class="row"><span class="label">Student Name:</span> ${item.certificate_name || item.user_name}</div>
            <div class="row"><span class="label">Event:</span> ${item.event_title}</div>
            <div class="row"><span class="label">Event Date:</span> ${formatDateIN(item.event_date)}</div>
            <div class="row"><span class="label">Venue:</span> ${item.venue || "-"}</div>
            <div class="row"><span class="label">Issued At:</span> ${formatDateIN(item.issued_at)}</div>
          </div>
        </body>
      </html>
    `);
  } catch (e) {
    console.error("verifyCertificate error:", e);

    return res.status(500).send(`
      <html>
        <head><title>Certificate Verification</title></head>
        <body style="font-family:Arial;padding:40px;">
          <h2>Verification Failed</h2>
          <p>Something went wrong while verifying the certificate.</p>
          <p>${e.message}</p>
        </body>
      </html>
    `);
  }
};
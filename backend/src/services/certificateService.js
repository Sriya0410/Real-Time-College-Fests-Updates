const pool = require("../config/db");

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function formatDateIN(value) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function buildCertificateNo(eventId, userId, certId) {
  const year = new Date().getFullYear();
  return `VFSTR-CERT-${year}-${eventId}-${userId}-${certId}`;
}

async function getUserById(userId) {
  const [rows] = await pool.query(
    `SELECT id, full_name, email
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

async function getEventById(eventId) {
  const [rows] = await pool.query(
    `SELECT 
        id,
        category_id,
        title,
        event_date,
        start_time,
        end_time,
        venue,
        status
     FROM events
     WHERE id = ?
     LIMIT 1`,
    [eventId]
  );

  const event = rows[0] || null;
  if (!event) return null;

  event.category_name = "";

  return event;
}

async function getRegistration(userId, eventId) {
  const [rows] = await pool.query(
    `SELECT 
        id,
        user_id,
        event_id,
        status,
        full_name,
        email,
        is_paid
     FROM event_registrations
     WHERE user_id = ? AND event_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [userId, eventId]
  );

  return rows[0] || null;
}

async function hasAttendance(userId, eventId, registrationId) {
  const [rows] = await pool.query(
    `SELECT id
     FROM attendance_logs
     WHERE event_id = ?
       AND registration_id = ?
     LIMIT 1`,
    [eventId, registrationId]
  );

  if (rows.length) return true;

  const [rows2] = await pool.query(
    `SELECT id
     FROM attendance_logs
     WHERE event_id = ?
       AND user_id = ?
     LIMIT 1`,
    [eventId, userId]
  );

  return rows2.length > 0;
}

async function getExistingCertificate(userId, eventId) {
  const [rows] = await pool.query(
    `SELECT 
        id,
        user_id,
        event_id,
        registration_id,
        certificate_name,
        certificate_no,
        file_url,
        issued_at
     FROM certificates
     WHERE user_id = ? AND event_id = ?
     LIMIT 1`,
    [userId, eventId]
  );

  return rows[0] || null;
}

function isEventCompleted(event) {
  const status = String(event.status || "").trim().toUpperCase();

  if (status === "COMPLETED") return true;
  if (status === "CANCELLED") return false;

  const eventDate = new Date(event.event_date);
  if (Number.isNaN(eventDate.getTime())) return false;

  return eventDate <= new Date();
}

async function getEligibility(userId, eventId) {
  const user = await getUserById(userId);

  if (!user) {
    return { eligible: false, reason: "User not found." };
  }

  const profileName = String(user.full_name || "").trim();

  if (!profileName) {
    return {
      eligible: false,
      reason: "Profile name is missing. Please update your profile first.",
      user,
      event: null,
      registration: null,
      existingCertificate: null,
    };
  }

  const event = await getEventById(eventId);

  if (!event) {
    return {
      eligible: false,
      reason: "Event not found.",
      user,
      event: null,
      registration: null,
      existingCertificate: null,
    };
  }

  const eventStatus = String(event.status || "").trim().toUpperCase();

  if (eventStatus === "CANCELLED") {
    return {
      eligible: false,
      reason: "Event was cancelled.",
      user,
      event,
      registration: null,
      existingCertificate: null,
    };
  }

  if (!isEventCompleted(event)) {
    return {
      eligible: false,
      reason: "Certificate is available only after the event is completed.",
      user,
      event,
      registration: null,
      existingCertificate: null,
    };
  }

  const registration = await getRegistration(userId, eventId);

  if (!registration) {
    return {
      eligible: false,
      reason: "No registration found for this event.",
      user,
      event,
      registration: null,
      existingCertificate: null,
    };
  }

  const regStatus = String(registration.status || "").trim().toUpperCase();

  const allowedStatuses = [
    "APPROVED",
    "CONFIRMED",
    "REGISTERED",
    "PAID",
    "SUCCESS",
  ];

  if (regStatus && !allowedStatuses.includes(regStatus)) {
    return {
      eligible: false,
      reason: `Registration is not approved. Current status: ${registration.status}`,
      user,
      event,
      registration,
      existingCertificate: null,
    };
  }

  if (registration.full_name) {
    const regName = String(registration.full_name || "").trim();

    if (regName && normalizeName(profileName) !== normalizeName(regName)) {
      return {
        eligible: false,
        reason:
          "Profile name must match registration name before certificate generation.",
        user,
        event,
        registration,
        existingCertificate: null,
      };
    }
  }

  const attended = await hasAttendance(userId, eventId, registration.id);

  if (!attended) {
    return {
      eligible: false,
      reason:
        "Attendance not marked. Certificate is available only for attendees.",
      user,
      event,
      registration,
      existingCertificate: null,
    };
  }

  const existingCertificate = await getExistingCertificate(userId, eventId);

  return {
    eligible: true,
    reason: "Eligible for certificate.",
    user,
    event,
    registration,
    existingCertificate,
  };
}

async function createCertificateIfNeeded({
  userId,
  eventId,
  registrationId,
  certificateName,
}) {
  let existing = await getExistingCertificate(userId, eventId);

  if (existing) return existing;

  const [insertResult] = await pool.query(
    `INSERT INTO certificates
      (user_id, event_id, registration_id, certificate_name, certificate_no, file_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, eventId, registrationId, certificateName, "TEMP", null]
  );

  const certId = insertResult.insertId;
  const certNo = buildCertificateNo(eventId, userId, certId);

  await pool.query(
    `UPDATE certificates
     SET certificate_no = ?
     WHERE id = ?`,
    [certNo, certId]
  );

  existing = await getExistingCertificate(userId, eventId);
  return existing;
}

async function listMyCertificates(userId) {
  const [rows] = await pool.query(
    `SELECT
        c.id,
        c.user_id,
        c.event_id,
        c.registration_id,
        c.certificate_name,
        c.certificate_no,
        c.file_url,
        c.issued_at,
        e.title AS event_title,
        e.event_date,
        e.venue,
        '' AS category_name
     FROM certificates c
     INNER JOIN events e ON e.id = c.event_id
     WHERE c.user_id = ?
     ORDER BY c.issued_at DESC`,
    [userId]
  );

  return rows;
}

async function listMyRegistrationsWithEvents(userId) {
  const [rows] = await pool.query(
    `SELECT
        r.id,
        r.user_id,
        r.event_id,
        r.status,
        r.full_name,
        r.email,
        r.is_paid,
        e.title AS event_title,
        e.event_date,
        e.venue,
        e.status AS event_status,
        e.category_id,
        '' AS category_name
     FROM event_registrations r
     INNER JOIN events e ON e.id = r.event_id
     WHERE r.user_id = ?
     ORDER BY r.id DESC`,
    [userId]
  );

  return rows;
}

module.exports = {
  normalizeName,
  formatDateIN,
  buildCertificateNo,
  getEligibility,
  createCertificateIfNeeded,
  listMyCertificates,
  listMyRegistrationsWithEvents,
};
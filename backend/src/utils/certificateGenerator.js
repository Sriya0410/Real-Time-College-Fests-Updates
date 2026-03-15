const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

function replaceAll(template, map) {
  let output = template;
  for (const [key, value] of Object.entries(map)) {
    const safeValue = value == null ? "" : String(value);
    output = output.split(`{{${key}}}`).join(safeValue);
  }
  return output;
}

async function generateCertificateHtml({
  userName,
  eventTitle,
  eventDate,
  venue,
  certificateNo,
  issuedAt,
  verifyUrl,
  baseUrl,
}) {
  const templatePath = path.join(__dirname, "../templates/certificateTemplate.html");
  const template = fs.readFileSync(templatePath, "utf8");

  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl);

  const html = replaceAll(template, {
    USER_NAME: userName,
    EVENT_TITLE: eventTitle,
    EVENT_DATE: eventDate,
    VENUE_BLOCK: venue ? `<br />Venue: <b>${venue}</b>` : "",
    CERTIFICATE_NO: certificateNo,
    ISSUED_AT: issuedAt,
    QR_CODE_DATA_URL: qrCodeDataUrl,
    LOGO_URL: `${baseUrl}/assets/vignan-logo.png`,
    VC_SIGNATURE_URL: `${baseUrl}/assets/vc-signature-cropped.png`,
    COLLEGE_NAME: `Vignan's Foundation for Science, Technology & Research`,
    COLLEGE_SUBTITLE: `(Deemed to be University)`,
    VERIFY_URL: verifyUrl,
  });

  return html;
}

module.exports = {
  generateCertificateHtml,
};
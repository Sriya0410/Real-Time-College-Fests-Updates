import api from "./api";

export const certificateApi = {
  getMyCertificates() {
    return api.get("/certificates/my");
  },

  getDashboard() {
    return api.get("/certificates/dashboard");
  },

  checkEligibility(eventId) {
    return api.get(`/certificates/${eventId}/eligibility`);
  },

  openCertificateUrl(eventId) {
    const token = localStorage.getItem("token") || "";
    const base =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

    return `${base}/certificates/${eventId}/download?token=${encodeURIComponent(token)}`;
  },

  verifyUrl(certificateNo) {
    const base =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

    return `${base}/certificates/verify/${certificateNo}`;
  },
};

export default certificateApi;
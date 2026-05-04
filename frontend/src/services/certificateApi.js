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

  async openCertificate(eventId) {
    try {
      const res = await api.get(`/certificates/${eventId}/download`, {
        responseType: "blob",
      });

      const contentType = res.headers["content-type"] || "";

      if (contentType.includes("application/json")) {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || json.error || "Certificate error");
      }

      const blob = new Blob([res.data], {
        type: "text/html;charset=utf-8",
      });

      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 8000);
    } catch (e) {
      if (e?.response?.data instanceof Blob) {
        const text = await e.response.data.text();

        try {
          const json = JSON.parse(text);
          throw new Error(json.message || json.error || text);
        } catch (_err) {
          throw new Error(text || "Failed to open certificate.");
        }
      }

      throw e;
    }
  },

  async downloadCertificate(eventId, fileName = "certificate.pdf") {
    try {
      const res = await api.get(`/certificates/${eventId}/download-pdf`, {
        responseType: "blob",
      });

      const contentType = res.headers["content-type"] || "";

      if (contentType.includes("application/json")) {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || json.error || "Certificate error");
      }

      const blob = new Blob([res.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 8000);
    } catch (e) {
      if (e?.response?.data instanceof Blob) {
        const text = await e.response.data.text();

        try {
          const json = JSON.parse(text);
          throw new Error(json.message || json.error || text);
        } catch (_err) {
          throw new Error(text || "Failed to download certificate PDF.");
        }
      }

      throw e;
    }
  },

  verifyUrl(certificateNo) {
    const base =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

    return `${base}/certificates/verify/${certificateNo}`;
  },
};

export default certificateApi;
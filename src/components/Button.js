import React, { useState } from "react";

const ExportBaselineCsvButton = () => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const res = await fetch("https://erp-back-pl3q.onrender.com/api/export-baseline", {
        method: "GET",
      });
      if (!res.ok) throw new Error("Failed to export CSV");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "baseline_forecast_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Export failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        borderRadius: "10px",
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        background:
          "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(99,102,241,1) 100%)",
        color: "#fff",
        fontWeight: 700,
        boxShadow: "0 8px 18px rgba(37,99,235,0.25)",
        transition: "transform 120ms ease, box-shadow 120ms ease, opacity 120ms",
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 10px 22px rgba(37,99,235,0.32)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 8px 18px rgba(37,99,235,0.25)";
      }}
    >
      {loading ? "Exporting…" : "Export CSV"}
      {!loading && (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          style={{ display: "block" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 21h16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
};

export default ExportBaselineCsvButton;

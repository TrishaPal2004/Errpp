import React, { useState } from "react";

export default function OffcanvasMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Button to open Offcanvas */}
      <button
        onClick={toggleMenu}
        style={{
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "8px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Open Menu
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={closeMenu}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1040,
            transition: "opacity 0.3s ease",
          }}
        />
      )}

      {/* Offcanvas Component */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: isOpen ? 0 : "-250px",
          width: "250px",
          height: "100%",
          backgroundColor: "#f8f9fa",
          zIndex: 1050,
          transition: "left 0.3s ease",
          boxShadow: isOpen ? "2px 0 5px rgba(0, 0, 0, 0.2)" : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            borderBottom: "1px solid #ddd",
            padding: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h5 style={{ margin: 0, fontSize: "18px", fontWeight: "500" }}>Menu</h5>
          <button
            onClick={closeMenu}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              padding: "0",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "0" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <a
              href="/erp"
              onClick={closeMenu}
              style={{
                padding: "12px 16px",
                textDecoration: "none",
                color: "#000",
                borderBottom: "1px solid #ddd",
                transition: "background-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#e9ecef";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
              }}
            >
              ERP
            </a>
            <a
              href="/plant-capacity"
              onClick={closeMenu}
              style={{
                padding: "12px 16px",
                textDecoration: "none",
                color: "#000",
                transition: "background-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#e9ecef";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
              }}
            >
              Production Capacity Management
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
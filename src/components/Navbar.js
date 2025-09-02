import React from "react";

export default function BlueNavbar() {
  return (
    <nav
      style={{
        backgroundColor: "#007bff",
        padding: "12px 20px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            color: "white",
            fontSize: "24px",
            fontWeight: "bold",
            textDecoration: "none",
          }}
        >
          <a
            href="/"
            style={{
              color: "white",
              textDecoration: "none",
            }}
          >
           FreshBites
          </a>
        </div>

        {/* Navigation Links */}
        <div
          style={{
            display: "flex",
            gap: "30px",
            alignItems: "center",
          }}
        >
          <a
            href="/"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: "500",
              padding: "8px 16px",
              borderRadius: "4px",
              transition: "background-color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            Home
          </a>

          <a
            href="/about"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: "500",
              padding: "8px 16px",
              borderRadius: "4px",
              transition: "background-color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            About Us
          </a>

          <a
            href="/contact"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: "500",
              padding: "8px 16px",
              borderRadius: "4px",
              transition: "background-color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            Contact
          </a>
        </div>
      </div>
    </nav>
  );
}
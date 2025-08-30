import React, { useState } from "react";

const RetailerFeedbackForm = ({
  cheeseDemand,
  snacksDemand,
  bakeryDemand,
  beveragesDemand,
  frozenDemand,
  dc
}) => {
  const [formData, setFormData] = useState({
   
    cheeseDemand,
    snacksDemand,
    bakeryDemand,
    beveragesDemand,
    frozenDemand,
    dc,
    product: "",
    stockStatus: "",
    value: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("https://erp-back-pl3q.onrender.com/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData), // send ALL data including props + user input
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Feedback submitted:", data);
        alert("Feedback submitted!");
      } else {
        alert("❌ Something went wrong");
      }
    } catch (err) {
      console.error("⚠️ Error submitting feedback:", err);
      alert("Server error. Try again later!");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: "400px",
        margin: "2rem auto",
        padding: "1.5rem",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        backgroundColor: "#fff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2 style={{ marginBottom: "1rem", textAlign: "center" }}>
        Feedback for {retailerName}
      </h2>

      {/* Product Dropdown */}
      <label style={{ display: "block", marginBottom: "0.5rem" }}>Product</label>
      <select
        name="product"
        value={formData.product}
        onChange={handleChange}
        required
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
      >
        <option value="">-- Select Product --</option>
        <option value="Beverages">Beverages</option>
        <option value="Bakery">Bakery</option>
        <option value="Snacks">Snacks</option>
        <option value="Cheese">Cheese</option>
        <option value="Frozen">Frozen</option>
      </select>

      {/* Stock Status Dropdown */}
      <label style={{ display: "block", marginBottom: "0.5rem" }}>
        Stock Status
      </label>
      <select
        name="stockStatus"
        value={formData.stockStatus}
        onChange={handleChange}
        required
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
      >
        <option value="">-- Select Status --</option>
        <option value="Out of Stock">Out of Stock</option>
        <option value="Overstock">Overstock</option>
        <option value="Adequate">Adequate</option>
      </select>

      {/* Value Input */}
      <label style={{ display: "block", marginBottom: "0.5rem" }}>Value</label>
      <input
        type="number"
        name="value"
        value={formData.value}
        onChange={handleChange}
        placeholder="Enter value (e.g. 50)"
        required
        style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
      />

      <button
        type="submit"
        style={{
          width: "100%",
          padding: "0.75rem",
          backgroundColor: "#2563eb",
          color: "#fff",
          fontWeight: "bold",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Submit Feedback
      </button>
    </form>
  );
};

export default RetailerFeedbackForm;

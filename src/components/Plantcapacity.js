import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Factory, TrendingDown, TrendingUp, Calendar, Package, RefreshCw, Database, Bell, Settings, Download } from 'lucide-react';
import _ from 'lodash';
import OffcanvasMenu from './offcanvas';
import BlueNavbar from './Navbar';

const ProductionCapacitySystem = () => {
  // Database configuration (matching your ERP system)
  const [dbConfig, setDbConfig] = useState({
    host: process.env.REACT_APP_DB_HOST,
    port: process.env.REACT_APP_DB_PORT,
    database: process.env.REACT_APP_DB_DATABASE,
    username: process.env.REACT_APP_DB_USERNAME,
    password: process.env.REACT_APP_DB_PASSWORD,
    ssl: process.env.REACT_APP_DB_SSL === "true",
  });

  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [forecastData, setForecastData] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(1);
  const [currentWeek, setCurrentWeek] = useState(1);
  
  // Product capacities - customizable for each product
  const [productCapacities, setProductCapacities] = useState({
    'Snacks': { initial: 10000, current: 10000, threshold: 200,baseline: 10000 },
    'Beverages': { initial: 12000, current: 12000, threshold: 200 ,baseline: 12000},
    'Cheese': { initial: 8000, current: 8000, threshold: 200 ,baseline: 8000},
    'Bakery': { initial: 9000, current: 9000, threshold: 200,baseline: 9000 },
    'Frozen': { initial: 11000, current: 11000, threshold: 200,baseline: 11000 }
  });

  const [alerts, setAlerts] = useState([]);
  const [productionHistory, setProductionHistory] = useState([]);
  const [rolloverCapacity, setRolloverCapacity] = useState({});
  const [capacityReport, setCapacityReport] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoProcess, setAutoProcess] = useState(false);
  const [pdtqty,setpdtqty]=useState(0);
  // Extract product name from SKU
  const getProductFromSKU = (sku) => {
    const productMap = {
      'SKU001_Snacks': 'Snacks',
      'SKU002_Beverages': 'Beverages', 
      'SKU003_Cheese': 'Cheese',
      'SKU004_Bakery': 'Bakery',
      'SKU005_Frozen': 'Frozen'
    };
    return productMap[sku] || 'Unknown';
  };

  // Fetch forecast data from PostgreSQL
  const fetchForecastData = useCallback(async () => {
    if (connectionStatus === "disconnected") return;

    try {
      setConnectionStatus("fetching");
      
      const response = await fetch("https://erp-back-pl3q.onrender.com/api/erp-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            SELECT 
              week,
              sku,
              dc,
              forecast_ai_qty
            FROM forecast_data 
            ORDER BY week, dc, sku
          `,
          config: dbConfig,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setForecastData(data.results);
        setLastUpdated(new Date());
        setConnectionStatus("connected");
        setErrorMessage("");
      } else {
        throw new Error(data.error || "Unknown database error");
      }
    } catch (error) {
      console.error("Database fetch error:", error);
      setErrorMessage(`Failed to fetch data: ${error.message}`);
      setConnectionStatus("error");
    }
  }, [dbConfig, connectionStatus]);

  // Connect to database
  const connectToDatabase = async () => {
    setConnectionStatus("connecting");
    setErrorMessage("");

    try {
      const response = await fetch("https://erp-back-pl3q.onrender.com/api/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dbConfig),
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus("connected");
        await fetchForecastData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Connection error:", error);
      setErrorMessage(`Connection failed: ${error.message}`);
      setConnectionStatus("disconnected");
    }
  };

  // Calculate weekly demand by product
  const calculateWeeklyDemand = (week) => {
    const weeklyDemand = {};
    
    forecastData
      .filter(item => parseInt(item.week) === week)
      .forEach(item => {
        const product = getProductFromSKU(item.sku);
        if (!weeklyDemand[product]) {
          weeklyDemand[product] = 0;
        }
        weeklyDemand[product] += parseFloat(item.forecast_ai_qty) || 0;
      });
    
    return weeklyDemand;
  };

  // Process weekly demand and update capacities
  const processWeeklyDemand = () => {
    const weeklyDemand = calculateWeeklyDemand(currentWeek);
    const newCapacities = { ...productCapacities };
    const newAlerts = [];
    const newHistory = [];

    Object.keys(weeklyDemand).forEach(product => {
      const demand = Math.round(weeklyDemand[product]);
      const currentCapacity = newCapacities[product]?.current || 0;
      const threshold = newCapacities[product]?.threshold || 200;

      if (demand > 0) {
        const remainingCapacity = Math.max(0, currentCapacity - demand);
        
        newCapacities[product] = {
          ...newCapacities[product],
          current: remainingCapacity
        };

        // Add to history
        newHistory.push({
          week: currentWeek,
          month: currentMonth,
          product,
          demand,
          capacityBefore: currentCapacity,
          capacityAfter: remainingCapacity,
          timestamp: new Date().toISOString()
        });

        // Check for alerts
        if (remainingCapacity < threshold || remainingCapacity <demand) {
          newAlerts.push({
            id: `alert_${product}_${currentWeek}_${Date.now()}`,
            type: 'capacity_low',
            product,
            week: currentWeek,
            month: currentMonth,
            remainingCapacity,
            threshold,
            message: `${product} capacity is low. Manufacturing alert triggered!`,
            timestamp: new Date(),
            severity: remainingCapacity === 0 ? 'critical' : 'warning'
          });
        }
      }
    });

    setProductCapacities(newCapacities);
    setAlerts(prev => [...prev, ...newAlerts]);
    setProductionHistory(prev => [...prev, ...newHistory]);
  };

// Handle month rollover
const handleMonthRollover = () => {
  const newCapacities = { ...productCapacities };
  const rollover = {};

  Object.keys(newCapacities).forEach(product => {
    const { current, initial, used = 0 } = newCapacities[product];

    if (current > 0) {
      // ✅ Stock available → ADD to next month's fresh lot
      rollover[product] = current;
      const newBaseline = initial + current; // ⬅️ add leftover to initial lot
      newCapacities[product] = {
        ...newCapacities[product],
        current: newBaseline,  // next month has more capacity
        baseline: newBaseline, // new baseline = sum of both
        used: 0
      };
    } else {
      // ✅ Stock empty → just reset to fresh lot
      rollover[product] = 0;
      newCapacities[product] = {
        ...newCapacities[product],
        current: initial,
        baseline: initial,
        used: 0
      };
    }
  });

  setRolloverCapacity(prev => ({ ...prev, [currentMonth]: rollover }));
  setProductCapacities(newCapacities);

  // Add alerts
  const rolloverAlerts = Object.entries(rollover)
    .filter(([_, amount]) => amount > 0)
    .map(([product, amount]) => ({
      id: `rollover_${product}_${currentMonth}_${Date.now()}`,
      type: "rollover",
      product,
      amount: Math.round(amount),
      message: `${Math.round(amount)} units of ${product} added to next month's fresh lot (total: ${newCapacities[product].current})`,
      timestamp: new Date(),
      severity: "info"
    }));

  setAlerts(prev => [...prev, ...rolloverAlerts]);
};


  // Reset capacity for a product (simulate manufacturing)
  const resetProductCapacity = (product) => {
    setProductCapacities(prev => ({
     ...prev,
    [product]: {
      ...prev[product],
      current: prev[product].baseline || prev[product].initial
    }
    }));

    // Add manufacturing alert
    const manufacturingAlert = {
    id: `manufacturing_${product}_${Date.now()}`,
    type: 'manufacturing',
    product,
    message: `${product} manufacturing completed. Capacity reset to ${productCapacities[product]?.baseline || productCapacities[product]?.initial || 0} units.`,
    timestamp: new Date(),
    severity: 'success'
  };

  setAlerts(prev => [manufacturingAlert, ...prev]);
};

  

  // Generate CSV report
  const generateCSVReport = () => {
    const csvData = [];
    
    // Header
    csvData.push([
      'Month', 'Week', 'Product', 'Initial_Capacity', 'Current_Capacity', 
      'Weekly_Demand', 'Remaining_After_Demand', 'Alert_Status', 'Rollover_Amount'
    ]);

    // Data rows
    productionHistory.forEach(record => {
      const product = record.product;
      const rollover = rolloverCapacity[record.month]?.[product] || 0;
      const alertStatus = record.capacityAfter < productCapacities[product]?.threshold ? 'LOW_CAPACITY' : 'NORMAL';
      
      csvData.push([
        record.month,
        record.week,
        record.product,
        record.capacityBefore,
        record.capacityAfter,
        record.demand,
        record.capacityAfter,
        alertStatus,
        rollover
      ]);
    });

    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capacity_report_month_${currentMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Auto-process functionality
  useEffect(() => {
    let interval;
    if (autoProcess && connectionStatus === "connected" && forecastData.length > 0) {
      interval = setInterval(() => {
        processWeeklyDemand();
       setCurrentWeek(prev => {
  const nextWeek = prev + 1;
  if (nextWeek > 104) {
    return 104; // Stop at week 104
  }
  // Trigger month rollover every 4 weeks (weeks 4, 8, 12, 16, etc.)
  if (nextWeek % 4 === 0) {
    handleMonthRollover();
  }
  return nextWeek;
});
      }, 5000); // Process every 5 seconds for demo
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoProcess, connectionStatus, forecastData, currentWeek]);


  //Handle next week
 const handleNextWeek = () => {
  if (currentWeek >= 104) return;
  
  const newWeek = currentWeek + 1;
  
  // Check for month rollover every 4 weeks
  if (newWeek % 4 === 1 && newWeek > 1) {
    handleMonthRollover();
    setCurrentMonth(prev => prev + 1);
  }
  
  setCurrentWeek(newWeek);
  // Remove these lines - they're breaking your data:
  // const weekData = forecastData.filter((item) => parseInt(item.week) === newWeek);
  // setForecastData(weekData);
  
  processWeeklyDemand();
};

  // Connection Status Component
  const ConnectionStatus = () => (
    <div className="flex items-center space-x-4 mb-6">
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
        connectionStatus === "connected" ? "bg-green-100 text-green-800" :
        connectionStatus === "connecting" || connectionStatus === "fetching" ? "bg-yellow-100 text-yellow-800" :
        "bg-red-100 text-red-800"
      }`}>
        <Database className="w-4 h-4" />
        <span className="capitalize">{connectionStatus}</span>
      </div>
      
      {lastUpdated && (
        <div className="text-sm text-gray-600">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );

return (
  <div
    style={{
      minHeight: "100vh",
      background: "linear-gradient(to bottom right, #eff6ff, #e0e7ff)",
    }}
  >
    <BlueNavbar/>
    <OffcanvasMenu/>
    <div
      style={{
        maxWidth: "80rem",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "2rem",
          background: "linear-gradient(to right, #2563eb, #9333ea)",
          color: "#fff",
          padding: "2rem",
          borderRadius: "1rem",
          boxShadow: "0 10px 20px rgba(80,80,170,0.12)",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          }}
        >
          Production Capacity Management
        </h1>
        <p
          style={{
            fontSize: "1.125rem",
            opacity: 0.9,
          }}
        >
          Real-time capacity tracking with PostgreSQL integration
        </p>
      </div>

      {/* Database Connection */}
      <div
        style={{
          background: "#fff",
          borderRadius: "1rem",
          boxShadow: "0 4px 12px rgba(80,80,170,0.12)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Database Connection
          </h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={connectToDatabase}
              disabled={connectionStatus === "connecting"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "0.75rem",
                color: "#fff",
                background:
                  connectionStatus === "connecting" ? "#9ca3af" : "#2563eb",
                transition: "background 0.2s",
                cursor:
                  connectionStatus === "connecting" ? "not-allowed" : "pointer",
                border: "none",
              }}
            >
              {connectionStatus === "connecting" ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {connectionStatus === "connecting"
                ? "Connecting..."
                : "Connect to PostgreSQL"}
            </button>
            <button
              onClick={fetchForecastData}
              disabled={connectionStatus !== "connected"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "0.75rem",
                color: "#fff",
                background:
                  connectionStatus === "connected" ? "#16a34a" : "#9ca3af",
                cursor:
                  connectionStatus !== "connected" ? "not-allowed" : "pointer",
                border: "none",
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
          </div>
        </div>
        <ConnectionStatus />
        {errorMessage && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fee2e2",
              borderRadius: "0.75rem",
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <AlertTriangle
                className="w-5 h-5"
                style={{ color: "#dc2626", marginRight: "0.5rem" }}
              />
              <span style={{ color: "#991b1b" }}>{errorMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div
        style={{
          background: "#fff",
          borderRadius: "1rem",
          boxShadow: "0 4px 12px rgba(80,80,170,0.12)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Production Control
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Calendar className="w-5 h-5" />
              <span style={{ fontWeight: 500 }}>
                Month {currentMonth}, Week {currentWeek}
              </span>
            </div>
            <button
              onClick={() => setAutoProcess(!autoProcess)}
              disabled={connectionStatus !== "connected" || forecastData.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "0.75rem",
                color: "#fff",
                background: autoProcess
                  ? "#dc2626"
                  : "#16a34a",
                cursor:
                  connectionStatus !== "connected" || forecastData.length === 0
                    ? "not-allowed"
                    : "pointer",
                border: "none",
              }}
            >
              {autoProcess ? "Stop Auto-Process" : "Start Auto-Process"}
            </button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "1rem",
          }}
        >
          <button
            onClick={processWeeklyDemand}
            disabled={connectionStatus !== "connected" || forecastData.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.75rem",
              color: "#fff",
              background:
                connectionStatus !== "connected" || forecastData.length === 0
                  ? "#9ca3af"
                  : "#2563eb",
              cursor:
                connectionStatus !== "connected" || forecastData.length === 0
                  ? "not-allowed"
                  : "pointer",
              border: "none",
            }}
          >
            <Package className="w-4 h-4" />
            Process Current Week
          </button>
          <button
            onClick={handleNextWeek}

           disabled={currentWeek >= 104}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.75rem",
              color: "#fff",
              background:  "#9333ea",
              
              border: "none",
            }}
          >
            <TrendingUp className="w-4 h-4" />
            Advance Week
          </button>
          <button
  onClick={handleMonthRollover}
  disabled={currentWeek % 4 !== 0} // ✅ disable if not end of month
  style={{
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    borderRadius: "0.75rem",
    color: "#fff",
    background: currentWeek % 4 === 0 ? "#f59e42" : "#d1d5db", // gray when disabled
    border: "none",
    cursor: currentWeek % 4 === 0 ? "pointer" : "not-allowed",
    opacity: currentWeek % 4 === 0 ? 1 : 0.6, // slightly faded when disabled
  }}
>
  <Calendar className="w-4 h-4" />
  Month Rollover
</button>

        </div>
      </div>

      {/* Capacity Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(14rem, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {Object.entries(productCapacities).map(([product, capacity]) => {
          const utilizationRate =
            ((capacity.initial - capacity.current) / capacity.initial) * 100;
          const isLowCapacity = capacity.current < capacity.threshold;
          let borderColor = isLowCapacity
            ? "#dc2626"
            : utilizationRate > 70
            ? "#f59e42"
            : "#22c55e";
          return (
            <div
              key={product}
              style={{
                background: "#fff",
                borderRadius: "1rem",
                boxShadow: "0 4px 12px rgba(80,80,170,0.12)",
                padding: "1.5rem",
                borderLeft: `0.25rem solid ${borderColor}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <h3 style={{ fontWeight: 600, color: "#1f2937" }}>{product}</h3>
                {isLowCapacity && (
                  <AlertTriangle
                    className="w-5 h-5"
                    style={{ color: "#dc2626" }}
                  />
                )}
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span>Current:</span>
                  <span
                    style={{
                      fontWeight: 500,
                      color: isLowCapacity ? "#dc2626" : "#22c55e",
                    }}
                  >
                    {capacity.current.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span>Initial:</span>
                  <span style={{ fontWeight: 500 }}>
                    {capacity.initial.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.875rem",
                  }}
                >
                  <span>Used:</span>
                  <span style={{ fontWeight: 500 }}>
                   {((capacity.baseline - capacity.current) / capacity.baseline * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <div
                  style={{
                    width: "100%",
                    background: "#e5e7eb",
                    borderRadius: "9999px",
                    height: "0.5rem",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "0.5rem",
                      borderRadius: "9999px",
                      background:
                        utilizationRate > 90
                          ? "#dc2626"
                          : utilizationRate > 70
                          ? "#f59e42"
                          : "#22c55e",
                      width: `${Math.min(utilizationRate, 100)}%`,
                      position: "absolute",
                      left: 0,
                      top: 0,
                    }}
                  />
                </div>
              </div>
              {isLowCapacity && (
                <button
                  onClick={() => resetProductCapacity(product)}
                  style={{
                    marginTop: "0.75rem",
                    width: "100%",
                    background: "#dc2626",
                    color: "#fff",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.75rem",
                    border: "none",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  <Factory className="w-4 h-4" style={{ display: "inline", marginRight: "0.5rem" }} />
                  Trigger Manufacturing
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: "1rem",
            boxShadow: "0 4px 12px rgba(80,80,170,0.12)",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Bell className="w-5 h-5" />
              Active Alerts ({alerts.length})
            </h2>
            <button
              onClick={() => setAlerts([])}
              style={{
                fontSize: "0.875rem",
                color: "#4b5563",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Clear All
            </button>
          </div>
          <div style={{ maxHeight: "15rem", overflowY: "auto" }}>
            {alerts.slice(-10).reverse().map(alert => {
              let bgColor =
                alert.severity === "critical"
                  ? "#fef2f2"
                  : alert.severity === "warning"
                  ? "#fef3c7"
                  : alert.severity === "success"
                  ? "#f0fdf4"
                  : "#eff6ff";
              let borderColor =
                alert.severity === "critical"
                  ? "#dc2626"
                  : alert.severity === "warning"
                  ? "#f59e42"
                  : alert.severity === "success"
                  ? "#22c55e"
                  : "#2563eb";
              let textColor =
                alert.severity === "critical"
                  ? "#991b1b"
                  : alert.severity === "warning"
                  ? "#92400e"
                  : alert.severity === "success"
                  ? "#166534"
                  : "#1e40af";
              return (
                <div
                  key={alert.id}
                  style={{
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    borderLeft: `0.25rem solid ${borderColor}`,
                    background: bgColor,
                    marginBottom: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, color: textColor }}>
                        {alert.message}
                      </p>
                      <p style={{ fontSize: "0.875rem", color: "#4b5563", marginTop: ".25rem" }}>
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                    {alert.type === "capacity_low" && (
                      <button
                        onClick={() => resetProductCapacity(alert.product)}
                        style={{
                          marginLeft: "1rem",
                          background: "#dc2626",
                          color: "#fff",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "0.5rem",
                          fontSize: "0.875rem",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Manufacture
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Demand Forecast */}
      {forecastData.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: "1rem",
            boxShadow: "0 4px 12px rgba(80,80,170,0.12)",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
            Current Week Demand Forecast
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem 0" }}>SKU</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0" }}>Product</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0" }}>DC</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0" }}>Forecast Qty</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0" }}>Available Capacity</th>
                  <th style={{ textAlign: "center", padding: "0.5rem 0" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {forecastData
                  .filter(item => parseInt(item.week) === currentWeek)
                  .map((item, index) => {
                    const product = getProductFromSKU(item.sku);
                    const availableCapacity = productCapacities[product]?.current || 0;
                    const demand = parseFloat(item.forecast_ai_qty) || 0;
                    const canFulfill = availableCapacity >= demand;
                    return (
                      <tr
                        key={index}
                        style={{
                          borderBottom: "1px solid #e5e7eb",
                          background: canFulfill ? "transparent" : "#f9fafb",
                        }}
                      >
                        <td style={{ padding: "0.5rem 0" }}>{item.sku}</td>
                        <td style={{ padding: "0.5rem 0" }}>{product}</td>
                        <td style={{ padding: "0.5rem 0" }}>{item.dc}</td>
                        <td style={{ padding: "0.5rem 0", textAlign: "right" }}>
                          {Math.round(demand).toLocaleString()}
                        </td>
                        <td style={{ padding: "0.5rem 0", textAlign: "right" }}>
                          {availableCapacity.toLocaleString()}
                        </td>
                        <td style={{ padding: "0.5rem 0", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "9999px",
                              fontSize: "0.75rem",
                              background: canFulfill ? "#dcfce7" : "#fee2e2",
                              color: canFulfill ? "#166534" : "#991b1b",
                              fontWeight: 500,
                            }}
                          >
                            {canFulfill ? "OK" : "SHORTAGE"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Capacity Configuration */}
      <div
        style={{
          background: "#fff",
          borderRadius: "1rem",
          boxShadow: "0 4px 12px rgba(80,80,170,0.12)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
          Capacity Configuration
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
            gap: "1rem",
          }}
        >
          {Object.entries(productCapacities).map(([product, capacity]) => (
            <div key={product} style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1rem" }}>
              <h3 style={{ fontWeight: 500, marginBottom: ".75rem" }}>{product}</h3>
              <div>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", color: "#4b5563" }}>
                    Initial Capacity
                  </label>
                  <input
                    type="number"
                    value={capacity.initial}
                    onChange={e =>
                      setProductCapacities(prev => ({
                        ...prev,
                        [product]: { ...prev[product], initial: parseInt(e.target.value) || 0 },
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "0.25rem 0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      marginTop: "0.25rem",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", color: "#4b5563" }}>
                    Alert Threshold
                  </label>
                  <input
                    type="number"
                    value={capacity.threshold}
                    onChange={e =>
                      setProductCapacities(prev => ({
                        ...prev,
                        [product]: { ...prev[product], threshold: parseInt(e.target.value) || 0 },
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "0.25rem 0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      marginTop: "0.25rem",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production History & Export */}
      {productionHistory.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: "1rem",
            boxShadow: "0 4px 12px rgba(80,80,170,0.12)",
            padding: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Production History</h2>
            <button
              onClick={generateCSVReport}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "0.75rem",
                background: "#6366f1",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Download className="w-4 h-4" />
              Export CSV Report
            </button>
          </div>
          <div style={{ overflowX: "auto", maxHeight: "20rem", overflowY: "auto" }}>
            <table style={{ width: "100%" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f3f4f6" }}>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Week</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Product</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem" }}>Demand</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem" }}>Capacity Before</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem" }}>Capacity After</th>
                  <th style={{ textAlign: "center", padding: "0.5rem 0.75rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {productionHistory.slice(-20).reverse().map((record, idx) => {
                  const isLowCapacity = record.capacityAfter < productCapacities[record.product]?.threshold;
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb", background: isLowCapacity ? "#fee2e2" : "transparent" }}>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        M{record.month}W{record.week}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>{record.product}</td>
                      <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>
                        {record.demand.toLocaleString()}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>
                        {record.capacityBefore.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "0.5rem 0.75rem",
                          textAlign: "right",
                          fontWeight: 500,
                          color: isLowCapacity ? "#dc2626" : "#22c55e",
                        }}
                      >
                        {record.capacityAfter.toLocaleString()}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            background: isLowCapacity ? "#fee2e2" : "#dcfce7",
                            color: isLowCapacity ? "#991b1b" : "#166534",
                          }}
                        >
                          {isLowCapacity ? "LOW" : "OK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rollover Summary */}
      {Object.keys(rolloverCapacity).length > 0 && (
        <div style={{
          background: "#fff",
          borderRadius: "1rem",
          boxShadow: "0 4px 12px rgba(80,80,170,0.12)",
          padding: "1.5rem",
          marginTop: "1.5rem",
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
            Monthly Rollover Summary
          </h2>
          <div>
            {Object.entries(rolloverCapacity).map(([month, rollover]) => (
              <div key={month} style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1rem", marginBottom: ".75rem" }}>
                <h3 style={{ fontWeight: 500, marginBottom: ".75rem" }}>Month {month} Rollover</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {Object.entries(rollover).map(([product, amount]) => (
                    <div key={product} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.875rem", color: "#4b5563" }}>{product}</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#2563eb" }}>
                        {Math.round(amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Week Demand Summary */}
      {forecastData.length > 0 && (
        <div style={{
          background: "#fff",
          borderRadius: "1rem",
          boxShadow: "0 4px 12px rgba(80,80,170,0.12)",
          padding: "1.5rem",
          marginTop: "1.5rem",
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
            Week {currentWeek} Demand Summary
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
              gap: "1rem",
            }}
          >
            {Object.entries(calculateWeeklyDemand(currentWeek)).map(([product, demand]) => (
              <div key={product} style={{
                background: "#f5f8ff",
                borderRadius: "0.75rem",
                padding: "1rem",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "0.875rem", color: "#4b5563", marginBottom: ".25rem" }}>{product}</div>
                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#6366f1" }}>
                  {Math.round(demand).toLocaleString()}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>units demanded</div>
              </div>
            ))}
          </div>
        </div>
      )}

     
    </div>
  </div>
);

};

export default ProductionCapacitySystem;
import React, { useState, useEffect, useCallback } from 'react';
import { Database, Factory, Truck, Store, BarChart3, TrendingUp, Package, AlertCircle, RefreshCw, Wifi, WifiOff, Settings, Play, Square } from 'lucide-react';
import _ from 'lodash';
import RetailerFeedbackForm from './Customer';
const ERPDashboard = () => {
  const [dbConfig, setDbConfig] = useState({
    host: process.env.REACT_APP_DB_HOST,
    port: process.env.REACT_APP_DB_PORT,
    database: process.env.REACT_APP_DB_DATABASE,
    username: process.env.REACT_APP_DB_USERNAME,
    password: process.env.REACT_APP_DB_PASSWORD,
    ssl: process.env.REACT_APP_DB_SSL === 'true'
  });
  
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [rawData, setRawData] = useState([]);
  const [mappedData, setMappedData] = useState({
    factory: [],
    supplier: [],
    retailer: []
  });
  const [summaryStats, setSummaryStats] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [showConfig, setShowConfig] = useState(false);

  // Real-time data fetching function
  const fetchRealTimeData = useCallback(async () => {
    if (connectionStatus !== 'connected') return;
    
    try {
      setConnectionStatus('fetching');
      
      // Removed the blocking alert
      console.log('Fetching real-time data...');
      
      const response = await fetch(' https://erp-back-pl3q.onrender.com/api/erp-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            SELECT 
              week,
              sku,
              dc,
              forecast_ai_qty
            FROM forecast_data 
            WHERE week >= EXTRACT(WEEK FROM CURRENT_DATE) - 2
            ORDER BY week DESC, dc, sku
          `,
          config: dbConfig
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      if (data.success) {
        setRawData(data.results);
        processDataForERP(data.results);
        setLastUpdated(new Date());
        setConnectionStatus('connected');
        setErrorMessage('');
      } else {
        throw new Error(data.error || 'Unknown database error');
      }
      
    } catch (error) {
      console.error('Database fetch error:', error);
      setErrorMessage(`Failed to fetch data: ${error.message}`);
      setConnectionStatus('error');
    }
  }, [dbConfig, connectionStatus]);

  // Connect to PostgreSQL
  const connectToDatabase = async () => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    
    try {
      // Test connection first with the user's config
      const response = await fetch(' https://erp-back-pl3q.onrender.com/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbConfig)
      });
      
      if (!response.ok) {
        throw new Error(`Connection failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Connection test result:', result);
      
      if (result.success) {
        setConnectionStatus('connected');
        await fetchRealTimeData();
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      setErrorMessage(`Connection failed: ${error.message}`);
      setConnectionStatus('disconnected');
    }
  };
  let k,k1,k2,k3,k4;
  // Process raw PostgreSQL data for ERP visualization
  const processDataForERP = (forecastData) => {
    console.log('Processing data for ERP:', forecastData);
    
    if (!forecastData || forecastData.length === 0) {
      console.log('No data to process');
      return;
    }

    // Group by DC for analysis
    const dcSummary = _.groupBy(forecastData, 'dc');
    const skuAnalysis = _.groupBy(forecastData, 'sku');
    
    console.log('DC Summary:', dcSummary);
    console.log('SKU Analysis:', skuAnalysis);
    
    // Calculate current week totals
    const currentWeek = _.max(forecastData.map(item => parseInt(item.week)));
    const currentWeekData = forecastData.filter(item => parseInt(item.week) === currentWeek);
    
    console.log('Current Week:', currentWeek);
    console.log('Current Week Data:', currentWeekData);
    
    // Generate Factory data from demand patterns
    const factories = Object.entries(dcSummary).map(([dc, data]) => {
      const totalDemand = _.sumBy(data, item => parseFloat(item.forecast_ai_qty) || 0);
      const weeklyAvg = totalDemand / _.uniq(data.map(item => parseInt(item.week))).length;
      const uniqueSkus = _.uniq(data.map(item => item.sku));
      const CheeseDemand = _.sumBy(data.filter(item => item.sku.includes('Cheese')  && item.week === currentWeek-2), item => parseFloat(item.forecast_ai_qty) || 0);
      const SnacksDemand = _.sumBy(data.filter(item => item.sku.includes('Snacks')  && item.week === currentWeek-2), item => parseFloat(item.forecast_ai_qty) || 0);
      const BakeryDemand = _.sumBy(data.filter(item => item.sku.includes('Bakery')  && item.week === currentWeek-2), item => parseFloat(item.forecast_ai_qty) || 0);
const FrozenDemand = _.sumBy(
  data.filter(item => item.sku.includes('Frozen') && item.week === currentWeek),
  item => parseFloat(item.forecast_ai_qty) || 0
);
    const BeveragesDemand = _.sumBy(data.filter(item => item.sku.includes('Beverages') && item.week === currentWeek-2), item => parseFloat(item.forecast_ai_qty) || 0);  
      return {
        factory_id: `FC_${dc.toUpperCase()}`,
        factory_name: `${dc} Production Facility`,
        location: dc,
        CheeseDemand,
        SnacksDemand,
        BakeryDemand,
        FrozenDemand,
        weekly_capacity: Math.round(weeklyAvg * 1.3),
        current_week_demand: Math.round(totalDemand),
        //operational_status: currentWeekDemand > weeklyAvg ? 'high_demand' : 'normal',
        active_skus: uniqueSkus.length,
        efficiency_score: Math.round(85 + Math.random() * 15),
        last_maintenance: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
    });

   const suppliers = Object.entries(skuAnalysis).map(([sku, data], index) => {
  const category = sku.split('_')[1] || 'General';
  const totalSupplyNeeded = _.sumBy(data, item => parseFloat(item.forecast_ai_qty) || 0);
  const locations = _.uniq(data.map(item => item.dc));

  const weekData = data.filter(item => item.week === currentWeek - 1);

  // Define all DCs and categories
  const dcs = ['Mumbai', 'Kolkata'];
  const categories = ['Cheese', 'Snacks', 'Bakery', 'Frozen'];

  // Compute non-zero DC-category sums dynamically
  const supplyFields = {};
  categories.forEach(cat => {
    dcs.forEach(dc => {
      const sum = _.sumBy(
        weekData.filter(item => item.sku.includes(cat) && item.dc === dc),
        item => parseFloat(item.forecast_ai_qty) || 0
      );
      if (sum > 0) {
        const fieldName = `${cat}OnShip${dc}`;
        supplyFields[fieldName] = sum;
      }
    });
  });

  return {
    supplier_id: `SUP_${category.toUpperCase()}_${index + 1}`,
    supplier_name: `${category} Supply Co.`,
    ...supplyFields, // only non-zero DC-category fields
    material_category: category,
    total_supply_capacity: Math.round(totalSupplyNeeded * 1.2),
    current_committed: Math.round(totalSupplyNeeded * 0.85),
    availability_rate: Math.round(85 + Math.random() * 15),
    delivery_performance: Math.round(90 + Math.random() * 10),
    served_locations: locations.join(', '),
    contract_status: 'active',
    last_delivery: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
  };
});


    // Generate Retailer/DC data
    const retailers = Object.entries(dcSummary).map(([dc, data]) => {
      const currentWeekDemand = _.sumBy(
        data.filter(item => parseInt(item.week) === currentWeek), 
        item => parseFloat(item.forecast_ai_qty) || 0
      );
      const avgDemand = _.meanBy(data, item => parseFloat(item.forecast_ai_qty) || 0);
      // const skuCount = _.uniq(data.map(item => item.sku)).length;
      const demandTrend = currentWeekDemand > avgDemand ? 'increasing' : 'stable';
      const Cheese_Demand = _.sumBy(data.filter(item => item.sku.includes('Cheese')  && item.week === currentWeek), item => parseFloat(item.forecast_ai_qty) || 0);
      const Snacks_Demand = _.sumBy(data.filter(item => item.sku.includes('Snacks')  && item.week === currentWeek), item => parseFloat(item.forecast_ai_qty) || 0);
      const Bakery_Demand = _.sumBy(data.filter(item => item.sku.includes('Bakery')  && item.week === currentWeek), item => parseFloat(item.forecast_ai_qty) || 0);
      const Beverages_Demand = _.sumBy(data.filter(item => item.sku.includes('Beverages')  && item.week === currentWeek), item => parseFloat(item.forecast_ai_qty) || 0);
      const Frozen_Demand = _.sumBy(data.filter(item => item.sku.includes('Frozen')  && item.week === currentWeek), item => parseFloat(item.forecast_ai_qty) || 0);
     
      return {
        retailer_id: `DC_${dc.toUpperCase()}`,
        retailer_name: `${dc} Distribution Hub`,
        location: dc,
        current_week_forecast: Math.round(currentWeekDemand),
        average_weekly_demand: Math.round(avgDemand),
        inventory_level: Math.round(currentWeekDemand * 0.4),
        stock_status: currentWeekDemand > avgDemand * 1.2 ? 'critical' : 'adequate',
        Cheese_Demand,
        Snacks_Demand,
        Bakery_Demand,
        Beverages_Demand,
        Frozen_Demand,
        demand_trend: demandTrend,
        fulfillment_rate: Math.round(94 + Math.random() * 6),
        service_level: Math.round(96 + Math.random() * 4)
      };
    });

    // Calculate summary statistics
    const totalCurrentWeekDemand = _.sumBy(currentWeekData, item => parseFloat(item.forecast_ai_qty) || 0);
    const totalSkus = _.uniq(forecastData.map(item => item.sku)).length;
    const totalWeeks = _.uniq(forecastData.map(item => parseInt(item.week))).length;
    const totalLocations = _.uniq(forecastData.map(item => item.dc)).length;

    const stats = {
      currentWeekDemand: Math.round(totalCurrentWeekDemand),
      totalSkus,
      totalWeeks,
      totalLocations,
      dataPoints: forecastData.length,
      avgDemandPerSku: totalSkus > 0 ? Math.round(totalCurrentWeekDemand / totalSkus) : 0
    };

    console.log('Summary Stats:', stats);
    console.log('Factories:', factories);
    console.log('Suppliers:', suppliers);
    console.log('Retailers:', retailers);

    setSummaryStats(stats);

    setMappedData({
      factory: factories,
      supplier: _.uniqBy(suppliers, 'material_category').slice(0, 6),
      retailer: retailers
    });
  };

  // Auto-refresh functionality
  useEffect(() => {
    let interval;
    if (autoRefresh && connectionStatus === 'connected') {
      interval = setInterval(fetchRealTimeData, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, fetchRealTimeData, connectionStatus]);

  // Database Configuration Component
  const DatabaseConfig = () => (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Database className="w-6 h-6 mr-2 text-blue-600" />
          PostgreSQL Configuration
        </h2>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-blue-600 hover:text-blue-800"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
      
      {showConfig && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
            <input
              type="text"
              value={dbConfig.host}
              onChange={(e) => setDbConfig({...dbConfig, host: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="localhost"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <input
              type="number"
              value={dbConfig.port}
              onChange={(e) => setDbConfig({...dbConfig, port: parseInt(e.target.value)})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="5432"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
            <input
              type="text"
              value={dbConfig.database}
              onChange={(e) => setDbConfig({...dbConfig, database: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="erp_db"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={dbConfig.username}
              onChange={(e) => setDbConfig({...dbConfig, username: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="postgres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={dbConfig.password}
              onChange={(e) => setDbConfig({...dbConfig, password: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Interval (seconds)</label>
            <input
              type="number"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="10"
              max="300"
            />
          </div>
        </div>
      )}
      
      <div className="flex items-center space-x-4">
        <button
          onClick={connectToDatabase}
          disabled={connectionStatus === 'connecting'}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          {connectionStatus === 'connecting' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              <span>Connect</span>
            </>
          )}
        </button>
        
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          disabled={connectionStatus !== 'connected'}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
            autoRefresh 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400'
          }`}
        >
          {autoRefresh ? (
            <>
              <Square className="w-4 h-4" />
              <span>Stop Auto-refresh</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Start Auto-refresh</span>
            </>
          )}
        </button>
        
        <button
          onClick={fetchRealTimeData}
          disabled={connectionStatus !== 'connected'}
          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Now</span>
        </button>
      </div>
    </div>
  );

  // Connection Status Component
  const ConnectionStatus = () => (
    <div className="flex items-center space-x-4 mb-6">
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
        connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
        connectionStatus === 'connecting' || connectionStatus === 'fetching' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        {connectionStatus === 'connected' ? (
          <Wifi className="w-4 h-4" />
        ) : connectionStatus === 'connecting' || connectionStatus === 'fetching' ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="capitalize">{connectionStatus}</span>
      </div>
      
      {lastUpdated && (
        <div className="text-sm text-gray-600">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
      
      {autoRefresh && connectionStatus === 'connected' && (
        <div className="text-sm text-blue-600">
          Auto-refresh every {refreshInterval}s
        </div>
      )}
    </div>
  );

  // Error Message Component
  const ErrorMessage = () => (
    errorMessage && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{errorMessage}</span>
        </div>
      </div>
    )
  );

  // Block Card Component
const BlockCard = ({ title, icon: Icon, data, type, color }) => {
  // Convert border color string like "border-l-blue-500" into usable inline style
  const borderColor = color.replace("border-l-", "").replace("-", "");
  const iconColor = borderColor;

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "0.5rem",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        padding: "1.5rem",
        borderLeft: `4px solid ${iconColor}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Icon style={{ width: "2rem", height: "2rem", marginRight: "0.75rem", color: iconColor }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1f2937" }}>{title}</h2>
        </div>
        <span
          style={{
            backgroundColor: "#f3f4f6",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          {data.length} active
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxHeight: "24rem",
          overflowY: "auto",
        }}
      >
        {data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            <AlertCircle style={{ width: "3rem", height: "3rem", margin: "0 auto 0.5rem", opacity: 0.5 }} />
            <p>No {type} data available</p>
            <p style={{ fontSize: "0.875rem" }}>Connect to database to fetch real-time data</p>
          </div>
        ) : (
          data.map((item, index) => (
            <div
              key={index}
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: "0.5rem",
                padding: "1rem",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {Object.entries(item).map(([key, value]) => {
                  if (key.includes("_id")) return null; // Skip ID fields

                  return (
                    <div key={key} style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "#4b5563",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {key.replace(/_/g, " ")}
                      </span>
                      <span
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color:
                            typeof value === "number" && value > 1000
                              ? "#2563eb"
                              : "#111827",
                        }}
                      >
                        {typeof value === "number"
                          ? value > 100
                            ? value.toLocaleString()
                            : value.toFixed(1)
                          : value || "N/A"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
  return (
  <div
    style={{
      minHeight: "100vh",
      background: "linear-gradient(to bottom right, #dbeafe, #e0e7ff)",
      padding: "24px",
    }}
  >
    <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: "#1f2937",
            marginBottom: "12px",
          }}
        >
          Real-Time ERP Dashboard
        </h1>
        <p style={{ color: "#4b5563", fontSize: "1rem" }}>
          Live PostgreSQL data visualization for supply chain management
        </p>
      </div>

      {/* Database Config */}
      <DatabaseConfig />

      {/* Connection Status */}
      <ConnectionStatus />

      {/* Error Message */}
      <ErrorMessage />

      {/* Summary Stats */}
      {connectionStatus === "connected" && Object.keys(summaryStats).length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <StatCard
            icon={<BarChart3 style={{ width: 28, height: 28, color: "#2563eb" }} />}
            value={summaryStats.currentWeekDemand?.toLocaleString() || 0}
            label="Current Week Demand"
          />
          <StatCard
            icon={<Package style={{ width: 28, height: 28, color: "#16a34a" }} />}
            value={summaryStats.totalSkus}
            label="Active SKUs"
          />
          <StatCard
            icon={<Factory style={{ width: 28, height: 28, color: "#7c3aed" }} />}
            value={mappedData.factory.length}
            label="Factories"
          />
          <StatCard
            icon={<Truck style={{ width: 28, height: 28, color: "#ea580c" }} />}
            value={mappedData.supplier.length}
            label="Suppliers"
          />
          <StatCard
            icon={<Store style={{ width: 28, height: 28, color: "#dc2626" }} />}
            value={summaryStats.totalLocations}
            label="Locations"
          />
          <StatCard
            icon={<TrendingUp style={{ width: 28, height: 28, color: "#4f46e5" }} />}
            value={summaryStats.dataPoints?.toLocaleString() || 0}
            label="Data Points"
          />
        </div>
      )}

      {/* Main ERP Blocks */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "32px",
        }}
      >
        <BlockCard
          title="Factory Operations"
          icon={Factory}
          data={mappedData.factory}
          type="factory"
          color="border-l-blue-500"
        />
        <BlockCard
          title="Supplier Network"
          icon={Truck}
          data={mappedData.supplier}
          type="supplier"
          color="border-l-green-500"
        />
        <BlockCard
          title="Distribution Centers"
          icon={Store}
          data={mappedData.retailer}
          type="retailer"
          color="border-l-purple-500"
        />
      </div>
    </div>
    <h1>Customer Feedback Form for</h1>
   {retailers.map((retailer) => (
  <RetailerFeedbackForm
    cheeseDemand={retailer.Cheese_Demand}
    snacksDemand={retailer.Snacks_Demand}
    bakeryDemand={retailer.Bakery_Demand}
    beveragesDemand={retailer.Beverages_Demand}
    frozenDemand={retailer.Frozen_Demand}
    dc={retailer.location}
  />
))}

  </div>
);
function StatCard({ icon, value, label }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        padding: "20px",
        textAlign: "center",
        transition: "all 0.3s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ marginBottom: "10px" }}>{icon}</div>
      <div
        style={{
          fontSize: "1.25rem",
          fontWeight: "bold",
          color: "#1f2937",
          marginBottom: "4px",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{label}</div>
    </div>
  );
}
};

export default ERPDashboard;
import React, { useState, useEffect, useCallback } from 'react';
import { Database, Factory, Truck, Store, BarChart3, TrendingUp, Package, AlertCircle, RefreshCw, Wifi, WifiOff, Settings, Play, Square } from 'lucide-react';
import _ from 'lodash';

const ERPDashboard = () => {
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: 5432,
    database: 'demand_forecast',
    username: 'postgres',
    password: 'Tri@2004',
    ssl: false
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
      
      const response = await fetch('http://localhost:5000/api/erp-data', {
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
            FROM demand_forecast 
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
      const response = await fetch('http://localhost:5000/api/test-connection', {
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
      const skuCount = _.uniq(data.map(item => item.sku)).length;
      const demandTrend = currentWeekDemand > avgDemand ? 'increasing' : 'stable';
      
      return {
        retailer_id: `DC_${dc.toUpperCase()}`,
        retailer_name: `${dc} Distribution Hub`,
        location: dc,
        current_week_forecast: Math.round(currentWeekDemand),
        average_weekly_demand: Math.round(avgDemand),
        inventory_level: Math.round(currentWeekDemand * 0.4),
        stock_status: currentWeekDemand > avgDemand * 1.2 ? 'critical' : 'adequate',
        sku_portfolio: skuCount,
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
  const BlockCard = ({ title, icon: Icon, data, type, color }) => (
    <div className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Icon className={`w-8 h-8 mr-3 ${color.replace('border-l-', 'text-')}`} />
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
          {data.length} active
        </span>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No {type} data available</p>
            <p className="text-sm">Connect to database to fetch real-time data</p>
          </div>
        ) : (
          data.map((item, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(item).map(([key, value]) => {
                  if (key.includes('_id')) return null; // Skip ID fields in display
                  
                  return (
                    <div key={key} className="flex flex-col">
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-sm font-semibold ${
                        typeof value === 'number' && value > 1000 ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {typeof value === 'number' ? 
                          (value > 100 ? value.toLocaleString() : value.toFixed(1)) : 
                          (value || 'N/A')
                        }
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

   return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #dbeafe, #e0e7ff)',
      padding: '16px'
    }}>
      <div style={{
        maxWidth: '80rem',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px'
          }}>Real-Time ERP Dashboard</h1>
          <p style={{
            color: '#4b5563'
          }}>Live PostgreSQL data visualization for supply chain management</p>
        </div>

        {/* Database Configuration */}
        <DatabaseConfig />
        
        {/* Connection Status */}
        <ConnectionStatus />
        
        {/* Error Message */}
        <ErrorMessage />

        {/* Summary Stats */}
        {connectionStatus === 'connected' && Object.keys(summaryStats).length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              padding: '16px',
              textAlign: 'center'
            }}>
              <BarChart3 style={{
                width: '24px',
                height: '24px',
                margin: '0 auto 8px',
                color: '#2563eb'
              }} />
              <div style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>{summaryStats.currentWeekDemand?.toLocaleString() || 0}</div>
              <div style={{
                fontSize: '0.75rem',
                color: '#4b5563'
              }}>Current Week Demand</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              padding: '16px',
              textAlign: 'center'
            }}>
              <Package style={{
                width: '24px',
                height: '24px',
                margin: '0 auto 8px',
                color: '#16a34a'
              }} />
              <div style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>{summaryStats.totalSkus}</div>
              <div style={{
                fontSize: '0.75rem',
                color: '#4b5563'
              }}>Active SKUs</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              padding: '16px',
              textAlign: 'center'
            }}>
              <Factory style={{
                width: '24px',
                height: '24px',
                margin: '0 auto 8px',
                color: '#7c3aed'
              }} />
              <div style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>{mappedData.factory.length}</div>
              <div style={{
                fontSize: '0.75rem',
                color: '#4b5563'
              }}>Factories</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              padding: '16px',
              textAlign: 'center'
            }}>
              <Truck style={{
                width: '24px',
                height: '24px',
                margin: '0 auto 8px',
                color: '#ea580c'
              }} />
              <div style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>{mappedData.supplier.length}</div>
              <div style={{
                fontSize: '0.75rem',
                color: '#4b5563'
              }}>Suppliers</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              padding: '16px',
              textAlign: 'center'
            }}>
              <Store style={{
                width: '24px',
                height: '24px',
                margin: '0 auto 8px',
                color: '#dc2626'
              }} />
              <div style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>{summaryStats.totalLocations}</div>
              <div style={{
                fontSize: '0.75rem',
                color: '#4b5563'
              }}>Locations</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              padding: '16px',
              textAlign: 'center'
            }}>
              <TrendingUp style={{
                width: '24px',
                height: '24px',
                margin: '0 auto 8px',
                color: '#4f46e5'
              }} />
              <div style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#1f2937'
              }}>{summaryStats.dataPoints?.toLocaleString() || 0}</div>
              <div style={{
                fontSize: '0.75rem',
                color: '#4b5563'
              }}>Data Points</div>
            </div>
          </div>
        )}

        {/* Main ERP Blocks */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '32px'
        }}>
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
    </div>
  );
};

export default ERPDashboard;
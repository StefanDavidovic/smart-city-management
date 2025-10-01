import React, { useState, useEffect } from "react";
import "./App.css";

interface AirQualityData {
  id: string;
  location: string;
  coordinates: [number, number];
  timestamp: string;
  data: {
    pm25: number;
    pm10: number;
    no2: number;
    o3: number;
    co: number;
    so2: number;
    temperature: number;
    humidity: number;
    pressure: number;
  };
}

interface AirQualityAlert {
  id: string;
  sensorId: string;
  location: string;
  alertType: string;
  message: string;
  severity: string;
  timestamp: string;
}

const App: React.FC = () => {
  const [data, setData] = useState<AirQualityData[]>([]);
  const [alerts, setAlerts] = useState<AirQualityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dataResponse, alertsResponse] = await Promise.all([
        fetch("http://localhost:8000/api/air-quality/data/current"),
        fetch("http://localhost:8000/api/air-quality/alerts"),
      ]);

      const dataResult = await dataResponse.json();
      const alertsResult = await alertsResponse.json();

      setData(dataResult);
      setAlerts(alertsResult);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching air quality data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAirQualityIndex = (pm25: number): string => {
    if (pm25 <= 12) return "Good";
    if (pm25 <= 35) return "Moderate";
    if (pm25 <= 55) return "Unhealthy for Sensitive Groups";
    if (pm25 <= 150) return "Unhealthy";
    return "Hazardous";
  };

  const getAirQualityColor = (pm25: number): string => {
    if (pm25 <= 12) return "#48bb78";
    if (pm25 <= 35) return "#ed8936";
    if (pm25 <= 55) return "#f56565";
    if (pm25 <= 150) return "#e53e3e";
    return "#9f7aea";
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case "low":
        return "#48bb78";
      case "medium":
        return "#ed8936";
      case "high":
        return "#f56565";
      case "critical":
        return "#e53e3e";
      default:
        return "#718096";
    }
  };

  const getOverallStats = () => {
    if (data.length === 0)
      return { good: 0, moderate: 0, unhealthy: 0, hazardous: 0 };

    const stats = { good: 0, moderate: 0, unhealthy: 0, hazardous: 0 };
    data.forEach((sensor) => {
      const pm25 = sensor.data.pm25;
      if (pm25 <= 12) stats.good++;
      else if (pm25 <= 35) stats.moderate++;
      else if (pm25 <= 150) stats.unhealthy++;
      else stats.hazardous++;
    });
    return stats;
  };

  const stats = getOverallStats();

  return (
    <div className="app">
      <main className="app-main">
        {loading && data.length === 0 ? (
          <div className="loading">Loading air quality data...</div>
        ) : (
          <>
            {/* Header Section */}
            <div className="header-section">
              <h1 className="header-title">Air Quality Monitoring</h1>
              <p className="header-subtitle">
                Real-time air quality data for Novi Sad
              </p>
            </div>

            {/* Stats Overview */}
            <div className="stats-overview">
              <div className="stat-card">
                <div className="stat-icon good">✅</div>
                <div className="stat-number">{stats.good}</div>
                <div className="stat-label">Good Quality</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon moderate">⚠️</div>
                <div className="stat-number">{stats.moderate}</div>
                <div className="stat-label">Moderate</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon unhealthy">🚨</div>
                <div className="stat-number">{stats.unhealthy}</div>
                <div className="stat-label">Unhealthy</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon hazardous">☠️</div>
                <div className="stat-number">{stats.hazardous}</div>
                <div className="stat-label">Hazardous</div>
              </div>
            </div>

            {/* Sensors Grid */}
            <section className="sensors-grid">
              <h2 className="section-title">Sensor Readings</h2>
              <div className="sensors-container">
                {data.map((sensor) => (
                  <div key={sensor.id} className="sensor-card">
                    <div className="sensor-header">
                      <h3 className="sensor-title">{sensor.location}</h3>
                      <div
                        className="air-quality-index"
                        style={{
                          backgroundColor: getAirQualityColor(sensor.data.pm25),
                        }}
                      >
                        {getAirQualityIndex(sensor.data.pm25)}
                      </div>
                    </div>

                    <div className="sensor-data">
                      <div className="data-row">
                        <span className="data-label">PM2.5:</span>
                        <span className="data-value">
                          {sensor.data.pm25.toFixed(1)} μg/m³
                        </span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">PM10:</span>
                        <span className="data-value">
                          {sensor.data.pm10.toFixed(1)} μg/m³
                        </span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">NO₂:</span>
                        <span className="data-value">
                          {sensor.data.no2.toFixed(1)} μg/m³
                        </span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">O₃:</span>
                        <span className="data-value">
                          {sensor.data.o3.toFixed(1)} μg/m³
                        </span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">CO:</span>
                        <span className="data-value">
                          {sensor.data.co.toFixed(1)} mg/m³
                        </span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">SO₂:</span>
                        <span className="data-value">
                          {sensor.data.so2.toFixed(1)} μg/m³
                        </span>
                      </div>
                    </div>

                    <div className="sensor-meta">
                      <div className="data-row">
                        <span className="data-label">Temperature:</span>
                        <span className="data-value">
                          {sensor.data.temperature.toFixed(1)}°C
                        </span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">Humidity:</span>
                        <span className="data-value">
                          {sensor.data.humidity.toFixed(1)}%
                        </span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">Pressure:</span>
                        <span className="data-value">
                          {sensor.data.pressure.toFixed(1)} hPa
                        </span>
                      </div>
                    </div>
                    <p className="sensor-timestamp">
                      Last updated:{" "}
                      {new Date(sensor.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Alerts Section */}
            {alerts.length > 0 && (
              <section className="alerts-section">
                <h2 className="section-title">Air Quality Alerts</h2>
                <div className="alerts-container">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="alert-card">
                      <div className="alert-header">
                        <h3 className="alert-title">{alert.location}</h3>
                        <div
                          className="alert-severity"
                          style={{
                            backgroundColor: getSeverityColor(alert.severity),
                          }}
                        >
                          {alert.severity.toUpperCase()}
                        </div>
                      </div>
                      <div className="alert-content">
                        <p className="alert-message">{alert.message}</p>
                        <div className="alert-meta">
                          <span className="alert-type">{alert.alertType}</span>
                          <span className="alert-timestamp">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;

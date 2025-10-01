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
    if (pm25 <= 12) return "#00e400";
    if (pm25 <= 35) return "#ffff00";
    if (pm25 <= 55) return "#ff7e00";
    if (pm25 <= 150) return "#ff0000";
    return "#8f3f97";
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case "low":
        return "#00e400";
      case "medium":
        return "#ffff00";
      case "high":
        return "#ff7e00";
      case "critical":
        return "#ff0000";
      default:
        return "#666";
    }
  };

  return (
    <div className="app">
      <main className="app-main">
        {loading && data.length === 0 ? (
          <div className="loading">Loading air quality data...</div>
        ) : (
          <>
            <section className="sensors-grid">
              <h2>Sensor Readings</h2>
              <div className="sensors-container">
                {data.map((sensor) => (
                  <div key={sensor.id} className="sensor-card">
                    <div className="sensor-header">
                      <h3>{sensor.location}</h3>
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

                    <div className="sensor-timestamp">
                      {new Date(sensor.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="alerts-section">
              <h2>Air Quality Alerts</h2>
              {alerts.length === 0 ? (
                <div className="no-alerts">No active alerts</div>
              ) : (
                <div className="alerts-container">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="alert-card">
                      <div className="alert-header">
                        <h3>{alert.location}</h3>
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
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default App;

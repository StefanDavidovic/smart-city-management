import React, { useState, useEffect } from "react";
import "./App.css";

interface TrafficData {
  id: string;
  location: string;
  coordinates: [number, number];
  timestamp: string;
  data: {
    congestionLevel: number;
    averageSpeed: number;
    vehicleCount: number;
    waitingTime: number;
    trafficLightStatus: string;
    emergencyVehicles: number;
  };
}

interface TrafficAlert {
  id: string;
  intersectionId: string;
  location: string;
  alertType: string;
  message: string;
  severity: string;
  timestamp: string;
}

const App: React.FC = () => {
  const [data, setData] = useState<TrafficData[]>([]);
  const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
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
        fetch("http://localhost:8000/api/traffic/data/current"),
        fetch("http://localhost:8000/api/traffic/alerts"),
      ]);

      const dataResult = await dataResponse.json();
      const alertsResult = await alertsResponse.json();

      setData(dataResult);
      setAlerts(alertsResult);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching traffic data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCongestionLevel = (level: number): string => {
    if (level <= 20) return "Low";
    if (level <= 40) return "Moderate";
    if (level <= 60) return "High";
    if (level <= 80) return "Very High";
    return "Severe";
  };

  const getCongestionColor = (level: number): string => {
    if (level <= 20) return "#00e400";
    if (level <= 40) return "#ffff00";
    if (level <= 60) return "#ff7e00";
    if (level <= 80) return "#ff0000";
    return "#8f3f97";
  };

  const getTrafficLightColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "red":
        return "#e74c3c";
      case "yellow":
        return "#f39c12";
      case "green":
        return "#27ae60";
      default:
        return "#95a5a6";
    }
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
          <div className="loading">Loading traffic data...</div>
        ) : (
          <>
            <section className="intersections-grid">
              <h2>Traffic Intersections</h2>
              <div className="intersections-container">
                {data.map((intersection) => (
                  <div key={intersection.id} className="intersection-card">
                    <div className="intersection-header">
                      <h3>{intersection.location}</h3>
                      <div
                        className="congestion-level"
                        style={{
                          backgroundColor: getCongestionColor(
                            intersection.data.congestionLevel
                          ),
                        }}
                      >
                        {getCongestionLevel(intersection.data.congestionLevel)}
                      </div>
                    </div>

                    <div className="intersection-data">
                      <div className="data-row">
                        <span className="data-label">Congestion:</span>
                        <span className="data-value">
                          {intersection.data.congestionLevel}%
                        </span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">Average Speed:</span>
                        <span className="data-value">
                          {intersection.data.averageSpeed.toFixed(1)} km/h
                        </span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">Vehicle Count:</span>
                        <span className="data-value">
                          {intersection.data.vehicleCount}
                        </span>
                      </div>
                      <div className="data-row">
                        <span className="data-label">Waiting Time:</span>
                        <span className="data-value">
                          {intersection.data.waitingTime.toFixed(1)}s
                        </span>
                      </div>
                    </div>

                    <div className="traffic-light-section">
                      <div className="traffic-light-header">
                        <span className="data-label">Traffic Light:</span>
                        <div
                          className="traffic-light-status"
                          style={{
                            backgroundColor: getTrafficLightColor(
                              intersection.data.trafficLightStatus
                            ),
                          }}
                        >
                          {intersection.data.trafficLightStatus.toUpperCase()}
                        </div>
                      </div>
                      <div className="data-row">
                        <span className="data-label">Emergency Vehicles:</span>
                        <span className="data-value">
                          {intersection.data.emergencyVehicles}
                        </span>
                      </div>
                    </div>

                    <div className="intersection-timestamp">
                      {new Date(intersection.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="alerts-section">
              <h2>Traffic Alerts</h2>
              {alerts.length === 0 ? (
                <div className="no-alerts">No active traffic alerts</div>
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

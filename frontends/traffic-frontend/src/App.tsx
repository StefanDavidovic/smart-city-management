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
    if (level < 20) return "Low";
    if (level < 40) return "Moderate";
    if (level < 60) return "High";
    if (level < 80) return "Very High";
    return "Severe";
  };

  const getCongestionColor = (level: number): string => {
    if (level < 20) return "#48bb78";
    if (level < 40) return "#ed8936";
    if (level < 60) return "#f56565";
    if (level < 80) return "#e53e3e";
    return "#9f7aea";
  };

  const getTrafficLightColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "red":
        return "#e53e3e";
      case "yellow":
        return "#ed8936";
      case "green":
        return "#48bb78";
      default:
        return "#718096";
    }
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
    if (data.length === 0) return { low: 0, moderate: 0, high: 0, severe: 0 };

    const stats = { low: 0, moderate: 0, high: 0, severe: 0 };
    data.forEach((intersection) => {
      const congestion = intersection.data.congestionLevel;
      if (congestion < 20) stats.low++;
      else if (congestion < 40) stats.moderate++;
      else if (congestion < 80) stats.high++;
      else stats.severe++;
    });
    return stats;
  };

  const stats = getOverallStats();

  return (
    <div className="app">
      <main className="app-main">
        {loading && data.length === 0 ? (
          <div className="loading">Loading traffic data...</div>
        ) : (
          <>
            {/* Header Section */}
            <div className="header-section">
              <h1 className="header-title">Traffic Management</h1>
              <p className="header-subtitle">
                Real-time traffic data for Novi Sad intersections
              </p>
            </div>

            {/* Stats Overview */}
            <div className="stats-overview">
              <div className="stat-card">
                <div className="stat-icon low">🟢</div>
                <div className="stat-number">{stats.low}</div>
                <div className="stat-label">Low Congestion</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon moderate">🟡</div>
                <div className="stat-number">{stats.moderate}</div>
                <div className="stat-label">Moderate</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon high">🟠</div>
                <div className="stat-number">{stats.high}</div>
                <div className="stat-label">High Congestion</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon severe">🔴</div>
                <div className="stat-number">{stats.severe}</div>
                <div className="stat-label">Severe</div>
              </div>
            </div>

            {/* Intersections Grid */}
            <section className="intersections-grid">
              <h2 className="section-title">Traffic Intersections</h2>
              <div className="intersections-container">
                {data.map((intersection) => (
                  <div key={intersection.id} className="intersection-card">
                    <div className="intersection-header">
                      <h3 className="intersection-title">
                        {intersection.location}
                      </h3>
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

                    <div className="traffic-light-status-section">
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
                    <p className="intersection-timestamp">
                      Last updated:{" "}
                      {new Date(intersection.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Alerts Section */}
            {alerts.length > 0 && (
              <section className="alerts-section">
                <h2 className="section-title">Traffic Alerts</h2>
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

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import AirQualityChart from "./charts/AirQualityChart";
import TrafficChart from "./charts/TrafficChart";
import FacilitiesChart from "./charts/FacilitiesChart";
import { useWebSocket } from "../hooks/useWebSocket";
import "./Dashboard.css";

interface ServiceStatus {
  airQuality: boolean;
  traffic: boolean;
  facilities: boolean;
  notifications: boolean;
}

interface DashboardData {
  airQuality: {
    current: any[];
    alerts: any[];
  };
  traffic: {
    current: any[];
    alerts: any[];
  };
  facilities: {
    current: any[];
    occupancy: number;
  };
  notifications: {
    unread: number;
    recent: any[];
  };
}

const Dashboard: React.FC<{ serviceStatus: ServiceStatus }> = ({
  serviceStatus,
}) => {
  const [data, setData] = useState<DashboardData>({
    airQuality: { current: [], alerts: [] },
    traffic: { current: [], alerts: [] },
    facilities: { current: [], occupancy: 0 },
    notifications: { unread: 0, recent: [] },
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // WebSocket connections for real-time data
  const airQualityWs = useWebSocket({
    url: "ws://localhost:8001/ws",
    onMessage: (message) => {
      if (message.type === "air_quality_update") {
        setData((prev) => ({
          ...prev,
          airQuality: {
            ...prev.airQuality,
            current: message.data,
          },
        }));
        setLastUpdate(new Date());
      }
    },
    onError: (error) => {
      console.error("Air Quality WebSocket error:", error);
    },
    onOpen: () => {
      console.log("✅ Air Quality WebSocket connected");
    },
    onClose: () => {
      console.log("🔌 Air Quality WebSocket disconnected");
    },
    reconnectInterval: 10000, // Increase reconnect interval
    maxReconnectAttempts: 3, // Reduce max attempts
  });

  const trafficWs = useWebSocket({
    url: "ws://localhost:8002/ws",
    onMessage: (message) => {
      if (message.type === "traffic_update") {
        setData((prev) => ({
          ...prev,
          traffic: {
            ...prev.traffic,
            current: message.data,
          },
        }));
        setLastUpdate(new Date());
      }
    },
    onError: (error) => {
      console.error("Traffic WebSocket error:", error);
    },
    onOpen: () => {
      console.log("✅ Traffic WebSocket connected");
    },
    onClose: () => {
      console.log("🔌 Traffic WebSocket disconnected");
    },
    reconnectInterval: 10000, // Increase reconnect interval
    maxReconnectAttempts: 3, // Reduce max attempts
  });

  useEffect(() => {
    fetchDashboardData();
    // Reduce polling interval since we have WebSocket updates
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [airQualityData, trafficData, facilitiesData, notificationsData] =
        await Promise.all([
          fetch("http://localhost:8000/api/air-quality/data/current").then(
            (res) => res.json()
          ),
          fetch("http://localhost:8000/api/traffic/data/current").then((res) =>
            res.json()
          ),
          fetch("http://localhost:8000/api/facilities/facilities").then((res) =>
            res.json()
          ),
          fetch(
            "http://localhost:8000/api/notifications/notifications/user123/unread-count"
          ).then((res) => res.json()),
        ]);

      const [airQualityAlerts, trafficAlerts] = await Promise.all([
        fetch("http://localhost:8000/api/air-quality/alerts").then((res) =>
          res.json()
        ),
        fetch("http://localhost:8000/api/traffic/alerts").then((res) =>
          res.json()
        ),
      ]);

      setData({
        airQuality: {
          current: airQualityData,
          alerts: airQualityAlerts,
        },
        traffic: {
          current: trafficData,
          alerts: trafficAlerts,
        },
        facilities: {
          current: facilitiesData,
          occupancy: facilitiesData.reduce(
            (sum: number, facility: any) => sum + facility.currentOccupancy,
            0
          ),
        },
        notifications: {
          unread: notificationsData.unreadCount || 0,
          recent: [],
        },
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getServiceStatusText = (status: boolean) => {
    return status ? "Online" : "Offline";
  };

  const getServiceStatusColor = (status: boolean) => {
    return status ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Smart City Dashboard</h1>
        <div className="dashboard-controls">
          <div className="websocket-status">
            <div className="status-item">
              {airQualityWs.isConnected ? (
                <Wifi className="w-4 h-4" style={{ color: '#10b981' }} />
              ) : (
                <WifiOff className="w-4 h-4" style={{ color: '#ef4444' }} />
              )}
              <span className="status-text">
                Air Quality {airQualityWs.isConnected ? '(Connected)' : '(Disconnected)'}
              </span>
            </div>
            <div className="status-item">
              {trafficWs.isConnected ? (
                <Wifi className="w-4 h-4" style={{ color: '#10b981' }} />
              ) : (
                <WifiOff className="w-4 h-4" style={{ color: '#ef4444' }} />
              )}
              <span className="status-text">
                Traffic {trafficWs.isConnected ? '(Connected)' : '(Disconnected)'}
              </span>
            </div>
          </div>
          <Button
            onClick={fetchDashboardData}
            disabled={loading}
            className="refresh-button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <span className="last-update">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Service Status Overview */}
      <div className="service-status-grid">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getServiceStatusIcon(serviceStatus.airQuality)}
              Air Quality Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getServiceStatusColor(serviceStatus.airQuality)}>
              {getServiceStatusText(serviceStatus.airQuality)}
            </Badge>
            <p className="text-sm text-gray-600 mt-2">
              {data.airQuality.current.length} sensors active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getServiceStatusIcon(serviceStatus.traffic)}
              Traffic Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getServiceStatusColor(serviceStatus.traffic)}>
              {getServiceStatusText(serviceStatus.traffic)}
            </Badge>
            <p className="text-sm text-gray-600 mt-2">
              {data.traffic.current.length} intersections monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getServiceStatusIcon(serviceStatus.facilities)}
              Facilities Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getServiceStatusColor(serviceStatus.facilities)}>
              {getServiceStatusText(serviceStatus.facilities)}
            </Badge>
            <p className="text-sm text-gray-600 mt-2">
              {data.facilities.current.length} facilities managed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getServiceStatusIcon(serviceStatus.notifications)}
              Notification Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              className={getServiceStatusColor(serviceStatus.notifications)}
            >
              {getServiceStatusText(serviceStatus.notifications)}
            </Badge>
            <p className="text-sm text-gray-600 mt-2">
              {data.notifications.unread} unread notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(data.airQuality.alerts.length > 0 ||
        data.traffic.alerts.length > 0) && (
        <Card className="alerts-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="alerts-grid">
              {data.airQuality.alerts.map((alert: any) => (
                <div key={alert.id} className="alert-item">
                  <Badge className="bg-orange-100 text-orange-800">
                    Air Quality
                  </Badge>
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))}
              {data.traffic.alerts.map((alert: any) => (
                <div key={alert.id} className="alert-item">
                  <Badge className="bg-red-100 text-red-800">Traffic</Badge>
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <div className="charts-grid">
        <Card>
          <CardHeader>
            <CardTitle>Air Quality Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <AirQualityChart data={data.airQuality.current} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traffic Congestion</CardTitle>
          </CardHeader>
          <CardContent>
            <TrafficChart data={data.traffic.current} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facility Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <FacilitiesChart data={data.facilities.current} />
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats-grid">
        <Card>
          <CardHeader>
            <CardTitle>Total Facility Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">{data.facilities.occupancy}</div>
            <p className="text-sm text-gray-600">
              people across all facilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Air Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">
              {data.airQuality.current.length > 0
                ? Math.round(
                    data.airQuality.current.reduce(
                      (sum: number, sensor: any) => sum + sensor.data.pm25,
                      0
                    ) / data.airQuality.current.length
                  )
                : 0}
            </div>
            <p className="text-sm text-gray-600">PM2.5 μg/m³</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traffic Congestion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="stat-value">
              {data.traffic.current.length > 0
                ? Math.round(
                    data.traffic.current.reduce(
                      (sum: number, intersection: any) =>
                        sum + intersection.data.congestionLevel,
                      0
                    ) / data.traffic.current.length
                  )
                : 0}
              %
            </div>
            <p className="text-sm text-gray-600">average congestion level</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import AirQualityWidget from "./components/AirQualityWidget";
import TrafficWidget from "./components/TrafficWidget";
import FacilitiesWidget from "./components/FacilitiesWidget";
import NotificationsWidget from "./components/NotificationsWidget";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import "./App.css";

interface ServiceStatus {
  airQuality: boolean;
  traffic: boolean;
  facilities: boolean;
  notifications: boolean;
}

const App: React.FC = () => {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    airQuality: false,
    traffic: false,
    facilities: false,
    notifications: false,
  });

  useEffect(() => {
    checkServiceHealth();
    const interval = setInterval(checkServiceHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkServiceHealth = async () => {
    const services = [
      {
        name: "airQuality",
        url: "http://localhost:8000/api/air-quality/health",
      },
      { name: "traffic", url: "http://localhost:8000/api/traffic/health" },
      {
        name: "facilities",
        url: "http://localhost:8000/api/facilities/health",
      },
      {
        name: "notifications",
        url: "http://localhost:8000/api/notifications/health",
      },
    ];

    const statusPromises = services.map(async (service) => {
      try {
        const response = await fetch(service.url);
        const data = await response.json();
        return { name: service.name, status: data.status === "healthy" };
      } catch (error) {
        return { name: service.name, status: false };
      }
    });

    const results = await Promise.all(statusPromises);
    const newStatus = results.reduce((acc, result) => {
      acc[result.name as keyof ServiceStatus] = result.status;
      return acc;
    }, {} as ServiceStatus);

    setServiceStatus(newStatus);
  };

  return (
    <div className="app">
      <Header serviceStatus={serviceStatus} />
      <div className="app-content">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={<Dashboard serviceStatus={serviceStatus} />}
            />
            <Route path="/air-quality" element={<AirQualityWidget />} />
            <Route path="/traffic" element={<TrafficWidget />} />
            <Route path="/facilities" element={<FacilitiesWidget />} />
            <Route path="/notifications" element={<NotificationsWidget />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;

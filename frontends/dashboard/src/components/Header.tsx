import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Wind, Car, Building, Bell } from "lucide-react";
import "./Header.css";

interface ServiceStatus {
  airQuality: boolean;
  traffic: boolean;
  facilities: boolean;
  notifications: boolean;
}

const Header: React.FC<{ serviceStatus: ServiceStatus }> = ({
  serviceStatus,
}) => {
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/air-quality", label: "Air Quality", icon: Wind },
    { path: "/traffic", label: "Traffic", icon: Car },
    { path: "/facilities", label: "Facilities", icon: Building },
    { path: "/notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-brand">
          <h1>Smart City</h1>
        </div>
        <nav className="header-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="header-status">
          <div className="status-indicators">
            <div
              className={`status-dot ${
                serviceStatus.airQuality ? "online" : "offline"
              }`}
            />
            <div
              className={`status-dot ${
                serviceStatus.traffic ? "online" : "offline"
              }`}
            />
            <div
              className={`status-dot ${
                serviceStatus.facilities ? "online" : "offline"
              }`}
            />
            <div
              className={`status-dot ${
                serviceStatus.notifications ? "online" : "offline"
              }`}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

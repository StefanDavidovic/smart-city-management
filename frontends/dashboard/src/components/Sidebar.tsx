import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Wind, Car, Building, Bell } from "lucide-react";
import "./Sidebar.css";

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/air-quality", label: "Air Quality", icon: Wind },
    { path: "/traffic", label: "Traffic", icon: Car },
    { path: "/facilities", label: "Facilities", icon: Building },
    { path: "/notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? "active" : ""}`}
            >
              <Icon className="sidebar-icon" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

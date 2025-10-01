import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Wind, Car, Building, Bell, Users, LogOut } from "lucide-react";
import "./Sidebar.css";

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        const response = await fetch("http://localhost:8000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        await fetch("http://localhost:8000/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("auth_token");
      navigate("/login");
      window.location.reload();
    }
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/air-quality", label: "Air Quality", icon: Wind },
    { path: "/traffic", label: "Traffic", icon: Car },
    { path: "/facilities", label: "Facilities", icon: Building },
    { path: "/notifications", label: "Notifications", icon: Bell },
    ...(currentUser?.role === "admin"
      ? [{ path: "/users", label: "User Management", icon: Users }]
      : []),
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
        <div className="sidebar-divider"></div>
        <button className="sidebar-item logout-btn" onClick={handleLogout}>
          <LogOut className="sidebar-icon" />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;

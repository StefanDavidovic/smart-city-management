import React from "react";
import "./Badge.css";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "error";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = "",
  variant = "default",
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>{children}</span>
  );
};

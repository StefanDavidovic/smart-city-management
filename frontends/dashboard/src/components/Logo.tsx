import React from "react";

const Logo: React.FC = () => {
  return (
    <div className="logo">
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* City skyline */}
        <rect x="2" y="25" width="4" height="12" fill="#4299e1" />
        <rect x="7" y="20" width="4" height="17" fill="#4299e1" />
        <rect x="12" y="28" width="4" height="9" fill="#4299e1" />
        <rect x="17" y="22" width="4" height="15" fill="#4299e1" />
        <rect x="22" y="26" width="4" height="11" fill="#4299e1" />
        <rect x="27" y="18" width="4" height="19" fill="#4299e1" />
        <rect x="32" y="24" width="4" height="13" fill="#4299e1" />

        {/* Windows */}
        <rect x="3" y="27" width="1" height="1" fill="#ffffff" />
        <rect x="5" y="27" width="1" height="1" fill="#ffffff" />
        <rect x="8" y="22" width="1" height="1" fill="#ffffff" />
        <rect x="10" y="22" width="1" height="1" fill="#ffffff" />
        <rect x="8" y="25" width="1" height="1" fill="#ffffff" />
        <rect x="10" y="25" width="1" height="1" fill="#ffffff" />
        <rect x="18" y="24" width="1" height="1" fill="#ffffff" />
        <rect x="20" y="24" width="1" height="1" fill="#ffffff" />
        <rect x="28" y="20" width="1" height="1" fill="#ffffff" />
        <rect x="30" y="20" width="1" height="1" fill="#ffffff" />
        <rect x="28" y="23" width="1" height="1" fill="#ffffff" />
        <rect x="30" y="23" width="1" height="1" fill="#ffffff" />

        {/* Smart elements */}
        <circle cx="10" cy="15" r="2" fill="#48bb78" />
        <circle cx="20" cy="12" r="2" fill="#ed8936" />
        <circle cx="30" cy="14" r="2" fill="#f56565" />

        {/* Connection lines */}
        <path
          d="M10 15 L20 12"
          stroke="#718096"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
        <path
          d="M20 12 L30 14"
          stroke="#718096"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      </svg>
      <div className="logo-text">
        <span className="logo-title">Smart City</span>
        <span className="logo-subtitle">Novi Sad</span>
      </div>
    </div>
  );
};

export default Logo;

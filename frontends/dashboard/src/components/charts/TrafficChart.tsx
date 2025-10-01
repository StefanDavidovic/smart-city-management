import React from "react";
import "./TrafficChart.css";

interface TrafficChartProps {
  data: any[];
}

const TrafficChart: React.FC<TrafficChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>No traffic data available</p>
      </div>
    );
  }

  const getCongestionColor = (level: number) => {
    if (level <= 30) return "#00E400";
    if (level <= 60) return "#FFFF00";
    if (level <= 80) return "#FF8C00";
    return "#FF0000";
  };

  const getCongestionLabel = (level: number) => {
    if (level <= 30) return "Light";
    if (level <= 60) return "Moderate";
    if (level <= 80) return "Heavy";
    return "Severe";
  };

  return (
    <div className="traffic-chart">
      <div className="chart-header">
        <h4>Traffic Congestion by Intersection</h4>
      </div>
      <div className="chart-content">
        {data.map((intersection) => (
          <div key={intersection.id} className="intersection-item">
            <div className="intersection-info">
              <span className="intersection-name">{intersection.name}</span>
              <span className="intersection-congestion">
                {intersection.data.congestionLevel}%
              </span>
            </div>
            <div className="intersection-bar">
              <div
                className="intersection-bar-fill"
                style={{
                  width: `${intersection.data.congestionLevel}%`,
                  backgroundColor: getCongestionColor(
                    intersection.data.congestionLevel
                  ),
                }}
              />
            </div>
            <div className="intersection-details">
              <span className="vehicle-count">
                {intersection.data.vehicleCount} vehicles
              </span>
              <span
                className="congestion-status"
                style={{
                  color: getCongestionColor(intersection.data.congestionLevel),
                }}
              >
                {getCongestionLabel(intersection.data.congestionLevel)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrafficChart;

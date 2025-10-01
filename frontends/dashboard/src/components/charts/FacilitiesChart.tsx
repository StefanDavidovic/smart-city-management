import React from "react";
import "./FacilitiesChart.css";

interface FacilitiesChartProps {
  data: any[];
}

const FacilitiesChart: React.FC<FacilitiesChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>No facilities data available</p>
      </div>
    );
  }

  const getOccupancyColor = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage <= 30) return "#00E400";
    if (percentage <= 60) return "#FFFF00";
    if (percentage <= 80) return "#FF8C00";
    return "#FF0000";
  };

  const getOccupancyLabel = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage <= 30) return "Quiet";
    if (percentage <= 60) return "Moderate";
    if (percentage <= 80) return "Busy";
    return "Crowded";
  };

  return (
    <div className="facilities-chart">
      <div className="chart-header">
        <h4>Facility Occupancy</h4>
      </div>
      <div className="chart-content">
        {data.map((facility) => (
          <div key={facility.id} className="facility-item">
            <div className="facility-info">
              <span className="facility-name">{facility.name}</span>
              <span className="facility-type">
                {facility.type.replace("_", " ")}
              </span>
            </div>
            <div className="facility-occupancy">
              <span className="occupancy-count">
                {facility.currentOccupancy} / {facility.capacity}
              </span>
              <span
                className="occupancy-status"
                style={{
                  color: getOccupancyColor(
                    facility.currentOccupancy,
                    facility.capacity
                  ),
                }}
              >
                {getOccupancyLabel(
                  facility.currentOccupancy,
                  facility.capacity
                )}
              </span>
            </div>
            <div className="facility-bar">
              <div
                className="facility-bar-fill"
                style={{
                  width: `${
                    (facility.currentOccupancy / facility.capacity) * 100
                  }%`,
                  backgroundColor: getOccupancyColor(
                    facility.currentOccupancy,
                    facility.capacity
                  ),
                }}
              />
            </div>
            <div className="facility-status">
              <span className={`status-badge status-${facility.status}`}>
                {facility.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FacilitiesChart;

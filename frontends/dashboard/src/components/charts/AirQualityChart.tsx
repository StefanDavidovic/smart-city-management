import React from "react";
import "./AirQualityChart.css";

interface AirQualityChartProps {
  data: any[];
}

const AirQualityChart: React.FC<AirQualityChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>No air quality data available</p>
      </div>
    );
  }

  const getAQIColor = (pm25: number) => {
    if (pm25 <= 12) return "#00E400";
    if (pm25 <= 35) return "#FFFF00";
    if (pm25 <= 55) return "#FF8C00";
    if (pm25 <= 150) return "#FF0000";
    return "#8F3F97";
  };

  const getAQILabel = (pm25: number) => {
    if (pm25 <= 12) return "Good";
    if (pm25 <= 35) return "Moderate";
    if (pm25 <= 55) return "Unhealthy for Sensitive Groups";
    if (pm25 <= 150) return "Unhealthy";
    return "Hazardous";
  };

  return (
    <div className="air-quality-chart">
      <div className="chart-header">
        <h4>Current Air Quality by Location</h4>
      </div>
      <div className="chart-content">
        {data.map((sensor) => (
          <div key={sensor.id} className="sensor-item">
            <div className="sensor-info">
              <span className="sensor-location">{sensor.location}</span>
              <span className="sensor-pm25">{sensor.data.pm25} μg/m³</span>
            </div>
            <div className="sensor-bar">
              <div
                className="sensor-bar-fill"
                style={{
                  width: `${Math.min(100, (sensor.data.pm25 / 150) * 100)}%`,
                  backgroundColor: getAQIColor(sensor.data.pm25),
                }}
              />
            </div>
            <div className="sensor-status">
              <span
                className="status-indicator"
                style={{ color: getAQIColor(sensor.data.pm25) }}
              >
                {getAQILabel(sensor.data.pm25)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AirQualityChart;

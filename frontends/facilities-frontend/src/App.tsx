import React, { useState, useEffect } from "react";
import "./App.css";

interface Facility {
  id: string;
  name: string;
  type: string;
  location: string;
  coordinates: [number, number];
  capacity: number;
  currentOccupancy: number;
  status: string;
  amenities: string[];
  operatingHours: {
    open: string;
    close: string;
  };
  lastUpdated: string;
}

const App: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "http://localhost:8000/api/facilities/facilities"
      );
      const result = await response.json();
      setFacilities(result);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching facilities data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyPercentage = (
    current: number,
    capacity: number
  ): number => {
    return Math.round((current / capacity) * 100);
  };

  const getOccupancyColor = (percentage: number): string => {
    if (percentage <= 30) return "#27ae60";
    if (percentage <= 60) return "#f39c12";
    if (percentage <= 80) return "#e67e22";
    return "#e74c3c";
  };

  const getOccupancyStatus = (percentage: number): string => {
    if (percentage <= 30) return "Low";
    if (percentage <= 60) return "Moderate";
    if (percentage <= 80) return "High";
    return "Full";
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "open":
        return "#27ae60";
      case "closed":
        return "#e74c3c";
      case "maintenance":
        return "#f39c12";
      default:
        return "#95a5a6";
    }
  };

  const getFacilityIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case "library":
        return "📚";
      case "park":
        return "🌳";
      case "gym":
        return "💪";
      case "community center":
        return "🏢";
      case "swimming pool":
        return "🏊";
      case "playground":
        return "🎠";
      default:
        return "🏛️";
    }
  };

  const facilityTypes = [
    "all",
    ...Array.from(new Set(facilities.map((f) => f.type))),
  ];

  const filteredFacilities =
    selectedType === "all"
      ? facilities
      : facilities.filter((f) => f.type === selectedType);

  return (
    <div className="app">
      <main className="app-main">
        {loading && facilities.length === 0 ? (
          <div className="loading">Loading facilities data...</div>
        ) : (
          <>
            <section className="facilities-controls">
              <div className="filter-section">
                <label htmlFor="type-filter">Filter by type:</label>
                <select
                  id="type-filter"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="type-filter"
                >
                  {facilityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === "all" ? "All Facilities" : type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="stats-section">
                <div className="stat-card">
                  <div className="stat-number">{facilities.length}</div>
                  <div className="stat-label">Total Facilities</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {facilities.filter((f) => f.status === "open").length}
                  </div>
                  <div className="stat-label">Currently Open</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {Math.round(
                      facilities.reduce(
                        (sum, f) =>
                          sum +
                          getOccupancyPercentage(
                            f.currentOccupancy,
                            f.capacity
                          ),
                        0
                      ) / facilities.length
                    ) || 0}
                    %
                  </div>
                  <div className="stat-label">Avg. Occupancy</div>
                </div>
              </div>
            </section>

            <section className="facilities-grid">
              <h2>Facilities ({filteredFacilities.length})</h2>
              <div className="facilities-container">
                {filteredFacilities.map((facility) => (
                  <div key={facility.id} className="facility-card">
                    <div className="facility-header">
                      <div className="facility-title">
                        <span className="facility-icon">
                          {getFacilityIcon(facility.type)}
                        </span>
                        <h3>{facility.name}</h3>
                      </div>
                      <div
                        className="facility-status"
                        style={{
                          backgroundColor: getStatusColor(facility.status),
                        }}
                      >
                        {facility.status.toUpperCase()}
                      </div>
                    </div>

                    <div className="facility-info">
                      <div className="info-row">
                        <span className="info-label">Type:</span>
                        <span className="info-value">{facility.type}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Location:</span>
                        <span className="info-value">{facility.location}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Hours:</span>
                        <span className="info-value">
                          {facility.operatingHours.open} -{" "}
                          {facility.operatingHours.close}
                        </span>
                      </div>
                    </div>

                    <div className="occupancy-section">
                      <div className="occupancy-header">
                        <span className="info-label">Occupancy:</span>
                        <div
                          className="occupancy-status"
                          style={{
                            color: getOccupancyColor(
                              getOccupancyPercentage(
                                facility.currentOccupancy,
                                facility.capacity
                              )
                            ),
                          }}
                        >
                          {getOccupancyStatus(
                            getOccupancyPercentage(
                              facility.currentOccupancy,
                              facility.capacity
                            )
                          )}
                        </div>
                      </div>
                      <div className="occupancy-bar">
                        <div
                          className="occupancy-fill"
                          style={{
                            width: `${getOccupancyPercentage(
                              facility.currentOccupancy,
                              facility.capacity
                            )}%`,
                            backgroundColor: getOccupancyColor(
                              getOccupancyPercentage(
                                facility.currentOccupancy,
                                facility.capacity
                              )
                            ),
                          }}
                        ></div>
                      </div>
                      <div className="occupancy-numbers">
                        <span>
                          {facility.currentOccupancy} / {facility.capacity}
                        </span>
                        <span>
                          {getOccupancyPercentage(
                            facility.currentOccupancy,
                            facility.capacity
                          )}
                          %
                        </span>
                      </div>
                    </div>

                    {facility.amenities.length > 0 && (
                      <div className="amenities-section">
                        <span className="info-label">Amenities:</span>
                        <div className="amenities-list">
                          {facility.amenities.map((amenity, index) => (
                            <span key={index} className="amenity-tag">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="facility-timestamp">
                      Updated: {new Date(facility.lastUpdated).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default App;

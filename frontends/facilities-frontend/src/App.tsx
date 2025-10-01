import React, { useState, useEffect } from "react";
import "./App.css";

interface PublicFacility {
  id: string;
  name: string;
  type: string;
  location: string;
  coordinates: [number, number];
  capacity: number;
  currentOccupancy: number;
  operatingHours: {
    open: string;
    close: string;
  };
  amenities: string[];
  status: string;
  timestamp: string;
}

const App: React.FC = () => {
  const [facilities, setFacilities] = useState<PublicFacility[]>([]);
  const [loading, setLoading] = useState(true);
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
    if (percentage < 50) return "#48bb78";
    if (percentage < 80) return "#ed8936";
    return "#f56565";
  };

  const getOccupancyStatus = (percentage: number): string => {
    if (percentage < 50) return "Low";
    if (percentage < 80) return "Medium";
    return "High";
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "open":
        return "#48bb78";
      case "closed":
        return "#f56565";
      case "maintenance":
        return "#ed8936";
      default:
        return "#718096";
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
      case "sports_center":
        return "🏟️";
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

  const getOverallStats = () => {
    const totalFacilities = facilities.length;
    const openFacilities = facilities.filter((f) => f.status === "open").length;
    const avgOccupancy =
      facilities.length > 0
        ? Math.round(
            facilities.reduce(
              (sum, f) =>
                sum + getOccupancyPercentage(f.currentOccupancy, f.capacity),
              0
            ) / facilities.length
          )
        : 0;

    return { totalFacilities, openFacilities, avgOccupancy };
  };

  const stats = getOverallStats();

  return (
    <div className="app">
      <main className="app-main">
        {loading && facilities.length === 0 ? (
          <div className="loading">Loading facilities data...</div>
        ) : (
          <>
            {/* Header Section */}
            <div className="header-section">
              <h1 className="header-title">Public Facilities</h1>
              <p className="header-subtitle">
                Manage and monitor public facilities in Novi Sad
              </p>
            </div>

            {/* Controls Section */}
            <div className="facilities-controls">
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
                  <div className="stat-number">{stats.totalFacilities}</div>
                  <div className="stat-label">Total Facilities</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.openFacilities}</div>
                  <div className="stat-label">Currently Open</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.avgOccupancy}%</div>
                  <div className="stat-label">Avg. Occupancy</div>
                </div>
              </div>
            </div>

            {/* Facilities Grid */}
            <section className="facilities-grid">
              <h2 className="section-title">
                Facilities ({filteredFacilities.length})
              </h2>
              <div className="facilities-container">
                {filteredFacilities.map((facility) => (
                  <div key={facility.id} className="facility-card">
                    <div className="facility-header">
                      <span className="facility-icon">
                        {getFacilityIcon(facility.type)}
                      </span>
                      <h3 className="facility-title">{facility.name}</h3>
                    </div>
                    <div
                      className="facility-status"
                      style={{
                        backgroundColor: getStatusColor(facility.status),
                      }}
                    >
                      {facility.status.toUpperCase()}
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
                    <p className="facility-timestamp">
                      Last updated:{" "}
                      {new Date(facility.timestamp).toLocaleTimeString()}
                    </p>
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

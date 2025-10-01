export interface SensorData {
  id: string;
  location: string;
  coordinates: [number, number];
  timestamp: Date;
  data: Record<string, number>;
}

export interface AirQualityData extends SensorData {
  data: {
    pm25: number; // μg/m³
    pm10: number; // μg/m³
    o3: number; // μg/m³
    no2: number; // μg/m³
    co: number; // mg/m³
    so2: number; // μg/m³
    temperature: number; // °C
    humidity: number; // %
    pressure: number; // hPa
    aqi: number; // Air Quality Index
  };
}

export interface TrafficData extends SensorData {
  data: {
    vehicleCount: number;
    averageSpeed: number; // km/h
    congestionLevel: number; // 0-100%
    trafficLightStatus: "red" | "yellow" | "green";
  };
}

export interface PublicFacility {
  id: string;
  name: string;
  type: "park" | "library" | "sports_center" | "community_center";
  location: string;
  coordinates: [number, number];
  capacity: number;
  currentOccupancy: number;
  operatingHours: {
    open: string;
    close: string;
  };
  amenities: string[];
  status: "open" | "closed" | "maintenance";
}

export interface Reservation {
  id: string;
  facilityId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: "confirmed" | "pending" | "cancelled";
  purpose: string;
}

export interface Notification {
  id: string;
  userId?: string;
  type:
    | "air_quality_alert"
    | "traffic_update"
    | "facility_update"
    | "system_maintenance";
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  read: boolean;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface ServiceHealth {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  lastCheck: Date;
  dependencies: ServiceHealth[];
}

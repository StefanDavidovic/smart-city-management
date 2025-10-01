
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const formatTimestamp = (timestamp: Date): string => {
  return timestamp.toISOString();
};

export const parseTimestamp = (timestamp: string): Date => {
  return new Date(timestamp);
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getAirQualityIndex = (
  pm25: number
): {
  index: number;
  category: string;
  color: string;
} => {
  if (pm25 <= 12) {
    return { index: 1, category: "Good", color: "#00E400" };
  } else if (pm25 <= 35) {
    return { index: 2, category: "Moderate", color: "#FFFF00" };
  } else if (pm25 <= 55) {
    return {
      index: 3,
      category: "Unhealthy for Sensitive Groups",
      color: "#FF8C00",
    };
  } else if (pm25 <= 150) {
    return { index: 4, category: "Unhealthy", color: "#FF0000" };
  } else {
    return { index: 5, category: "Hazardous", color: "#8F3F97" };
  }
};

export const getTrafficCongestionLevel = (
  congestionLevel: number
): {
  level: string;
  color: string;
} => {
  if (congestionLevel <= 30) {
    return { level: "Light", color: "#00E400" };
  } else if (congestionLevel <= 60) {
    return { level: "Moderate", color: "#FFFF00" };
  } else if (congestionLevel <= 80) {
    return { level: "Heavy", color: "#FF8C00" };
  } else {
    return { level: "Severe", color: "#FF0000" };
  }
};

export const validateCoordinates = (coordinates: [number, number]): boolean => {
  const [lat, lon] = coordinates;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      await sleep(delay * attempt);
    }
  }
  throw new Error("Max attempts reached");
};

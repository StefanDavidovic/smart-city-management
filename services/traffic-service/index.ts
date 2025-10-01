import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { v4 as uuidv4 } from "uuid";
import amqp from "amqplib";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

let rabbitConnection: any = null;
let rabbitChannel: any = null;

async function connectToRabbitMQ() {
  try {
    const connectionString =
      process.env.RABBITMQ_URL || "amqp://admin:password@localhost:5672";
    rabbitConnection = await amqp.connect(connectionString);
    rabbitChannel = await rabbitConnection.createChannel();

    await rabbitChannel.assertExchange("traffic_events", "topic", {
      durable: true,
    });
    await rabbitChannel.assertExchange("smart_city_events", "topic", {
      durable: true,
    });

    console.log("Connected to RabbitMQ");
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
  }
}

async function publishTrafficEvent(routingKey: string, message: any) {
  try {
    if (!rabbitChannel) {
      await connectToRabbitMQ();
    }

    await rabbitChannel.publish(
      "traffic_events",
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        contentType: "application/json",
        timestamp: Date.now(),
      }
    );

    await rabbitChannel.publish(
      "smart_city_events",
      `traffic.${routingKey}`,
      Buffer.from(JSON.stringify(message)),
      {
        contentType: "application/json",
        timestamp: Date.now(),
      }
    );

    console.log(`Published traffic event: ${routingKey}`);
  } catch (error) {
    console.error("Failed to publish traffic event:", error);
  }
}

connectToRabbitMQ();

const INTERSECTIONS = [
  {
    id: "intersection-001",
    name: "Trg Republike",
    coordinates: [44.8176, 20.4565],
  },
  { id: "intersection-002", name: "Slavija", coordinates: [44.8024, 20.4656] },
  { id: "intersection-003", name: "Mostar", coordinates: [44.7896, 20.4206] },
  {
    id: "intersection-004",
    name: "Zeleni Venac",
    coordinates: [44.8142, 20.4565],
  },
  {
    id: "intersection-005",
    name: "Knez Mihailova",
    coordinates: [44.8176, 20.4565],
  },
];

interface TrafficData {
  id: string;
  name: string;
  coordinates: [number, number];
  timestamp: Date;
  data: {
    vehicleCount: number;
    averageSpeed: number;
    congestionLevel: number;
    trafficLightStatus: "red" | "yellow" | "green";
    waitingTime: number;
  };
}

interface TrafficLight {
  id: string;
  intersectionId: string;
  direction: string;
  status: "red" | "yellow" | "green";
  duration: number;
  nextChange: Date;
}

interface TrafficAlert {
  id: string;
  intersectionId: string;
  alertType: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
}

const trafficData: Map<string, TrafficData[]> = new Map();
const trafficLights: Map<string, TrafficLight[]> = new Map();
const activeConnections: Set<any> = new Set();

INTERSECTIONS.forEach((intersection) => {
  const lights: TrafficLight[] = [
    {
      id: `${intersection.id}-north`,
      intersectionId: intersection.id,
      direction: "north",
      status: "red",
      duration: 30,
      nextChange: new Date(Date.now() + 30000),
    },
    {
      id: `${intersection.id}-south`,
      intersectionId: intersection.id,
      direction: "south",
      status: "green",
      duration: 30,
      nextChange: new Date(Date.now() + 30000),
    },
    {
      id: `${intersection.id}-east`,
      intersectionId: intersection.id,
      direction: "east",
      status: "red",
      duration: 30,
      nextChange: new Date(Date.now() + 30000),
    },
    {
      id: `${intersection.id}-west`,
      intersectionId: intersection.id,
      direction: "west",
      status: "red",
      duration: 30,
      nextChange: new Date(Date.now() + 30000),
    },
  ];
  trafficLights.set(intersection.id, lights);
});

function generateRealisticTrafficData(intersectionId: string): TrafficData {
  const intersection = INTERSECTIONS.find((i) => i.id === intersectionId);
  if (!intersection) throw new Error("Intersection not found");

  const now = new Date();
  const hour = now.getHours();

  let baseVehicleCount = 20;
  let baseSpeed = 40;

  if ((7 <= hour && hour <= 9) || (17 <= hour && hour <= 19)) {
    baseVehicleCount = 80;
    baseSpeed = 25;
  } else if (22 <= hour || hour <= 6) {
    baseVehicleCount = 5;
    baseSpeed = 50;
  }

  const vehicleCount = Math.floor(
    baseVehicleCount * (0.8 + Math.random() * 0.4)
  );
  const averageSpeed = Math.floor(baseSpeed * (0.9 + Math.random() * 0.2));
  const congestionLevel = Math.min(100, Math.floor((vehicleCount / 100) * 100));

  const lights = trafficLights.get(intersectionId) || [];
  const avgWaitingTime =
    lights.reduce((sum, light) => {
      if (light.status === "red") return sum + light.duration;
      return sum;
    }, 0) / lights.length;

  const trafficData = {
    id: intersectionId,
    name: intersection.name,
    coordinates: intersection.coordinates as [number, number],
    timestamp: now,
    data: {
      vehicleCount,
      averageSpeed,
      congestionLevel,
      trafficLightStatus: lights[0]?.status || "red",
      waitingTime: Math.floor(avgWaitingTime),
    },
  };

  if (congestionLevel > 70) {
    const congestionEvent = {
      event_type: "traffic_congestion",
      intersection_id: intersectionId,
      intersection_name: intersection.name,
      coordinates: intersection.coordinates,
      congestion_level: congestionLevel,
      vehicle_count: vehicleCount,
      average_speed: averageSpeed,
      severity: congestionLevel > 90 ? "severe" : "heavy",
      timestamp: now.toISOString(),
      message: `Traffic congestion detected at ${intersection.name}: ${congestionLevel}% congestion level`,
    };

    publishTrafficEvent("congestion.heavy", congestionEvent);
  }

  return trafficData;
}

function getTrafficCongestionLevel(congestionLevel: number): {
  level: string;
  color: string;
} {
  if (congestionLevel <= 30) {
    return { level: "Light", color: "#00E400" };
  } else if (congestionLevel <= 60) {
    return { level: "Moderate", color: "#FFFF00" };
  } else if (congestionLevel <= 80) {
    return { level: "Heavy", color: "#FF8C00" };
  } else {
    return { level: "Severe", color: "#FF0000" };
  }
}

function updateTrafficLights(): void {
  const now = new Date();

  trafficLights.forEach((lights, intersectionId) => {
    lights.forEach((light) => {
      if (now >= light.nextChange) {
        if (light.status === "red") {
          light.status = "green";
          light.duration = 30;
        } else if (light.status === "green") {
          light.status = "yellow";
          light.duration = 5;
        } else if (light.status === "yellow") {
          light.status = "red";
          light.duration = 30;
        }

        light.nextChange = new Date(now.getTime() + light.duration * 1000);
      }
    });
  });
}

async function broadcastTrafficData(): Promise<void> {
  while (true) {
    try {
      if (activeConnections.size > 0) {
        updateTrafficLights();

        const currentData: TrafficData[] = [];

        INTERSECTIONS.forEach((intersection) => {
          const data = generateRealisticTrafficData(intersection.id);
          currentData.push(data);

          if (!trafficData.has(intersection.id)) {
            trafficData.set(intersection.id, []);
          }
          const intersectionData = trafficData.get(intersection.id)!;
          intersectionData.push(data);

          if (intersectionData.length > 100) {
            intersectionData.splice(0, intersectionData.length - 100);
          }
        });

        const message = {
          type: "traffic_update",
          data: currentData,
          trafficLights: Array.from(trafficLights.entries()).map(
            ([id, lights]) => ({
              intersectionId: id,
              lights: lights,
            })
          ),
          timestamp: new Date().toISOString(),
        };

        activeConnections.forEach((ws) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(message));
          }
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 10000)); // Update every 10 seconds
    } catch (error) {
      console.error("Error in broadcastTrafficData:", error);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}

broadcastTrafficData();

app.get("/", (req, res) => {
  res.json({
    service: "Traffic Management Service",
    status: "running",
    version: "1.0.0",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "traffic-service",
    timestamp: new Date().toISOString(),
    intersections: INTERSECTIONS.length,
    activeConnections: activeConnections.size,
  });
});

app.get("/intersections", (req, res) => {
  const intersections = INTERSECTIONS.map((intersection) => {
    const data = trafficData.get(intersection.id) || [];
    const lastUpdate =
      data.length > 0 ? data[data.length - 1].timestamp : new Date();

    return {
      id: intersection.id,
      name: intersection.name,
      coordinates: intersection.coordinates,
      status: "active",
      lastUpdate,
    };
  });

  res.json(intersections);
});

app.get("/intersections/:id/data", (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const intersection = INTERSECTIONS.find((i) => i.id === id);
  if (!intersection) {
    return res.status(404).json({ error: "Intersection not found" });
  }

  const data = trafficData.get(id) || [];
  const result = data.slice(-limit);

  res.json(result);
});

app.get("/intersections/:id/current", (req, res) => {
  const { id } = req.params;

  const intersection = INTERSECTIONS.find((i) => i.id === id);
  if (!intersection) {
    return res.status(404).json({ error: "Intersection not found" });
  }

  const data = trafficData.get(id) || [];
  if (data.length === 0) {
    const currentData = generateRealisticTrafficData(id);
    res.json(currentData);
  } else {
    res.json(data[data.length - 1]);
  }
});

app.get("/data/current", (req, res) => {
  const currentData: TrafficData[] = [];

  INTERSECTIONS.forEach((intersection) => {
    const data = trafficData.get(intersection.id) || [];
    if (data.length > 0) {
      currentData.push(data[data.length - 1]);
    } else {
      currentData.push(generateRealisticTrafficData(intersection.id));
    }
  });

  res.json(currentData);
});

app.get("/traffic-lights", (req, res) => {
  const result = Array.from(trafficLights.entries()).map(
    ([intersectionId, lights]) => ({
      intersectionId,
      lights: lights.map((light) => ({
        id: light.id,
        direction: light.direction,
        status: light.status,
        duration: light.duration,
        nextChange: light.nextChange,
      })),
    })
  );

  res.json(result);
});

app.post("/traffic-lights/:intersectionId/:lightId/control", (req, res) => {
  const { intersectionId, lightId } = req.params;
  const { status, duration } = req.body;

  const lights = trafficLights.get(intersectionId);
  if (!lights) {
    return res.status(404).json({ error: "Intersection not found" });
  }

  const light = lights.find((l) => l.id === lightId);
  if (!light) {
    return res.status(404).json({ error: "Traffic light not found" });
  }

  if (status && ["red", "yellow", "green"].includes(status)) {
    light.status = status;
    light.duration = duration || 30;
    light.nextChange = new Date(Date.now() + light.duration * 1000);

    res.json({ success: true, light });
  } else {
    res.status(400).json({ error: "Invalid status" });
  }
});

app.get("/alerts", (req, res) => {
  const alerts: TrafficAlert[] = [];

  INTERSECTIONS.forEach((intersection) => {
    const data = trafficData.get(intersection.id) || [];
    if (data.length > 0) {
      const latest = data[data.length - 1];
      const congestion = latest.data.congestionLevel;

      if (congestion >= 80) {
        alerts.push({
          id: uuidv4(),
          intersectionId: intersection.id,
          alertType: "traffic_congestion",
          message: `Severe traffic congestion at ${intersection.name}`,
          severity: "high",
          timestamp: latest.timestamp,
        });
      } else if (congestion >= 60) {
        alerts.push({
          id: uuidv4(),
          intersectionId: intersection.id,
          alertType: "traffic_congestion",
          message: `Heavy traffic at ${intersection.name}`,
          severity: "medium",
          timestamp: latest.timestamp,
        });
      }
    }
  });

  res.json(alerts);
});

wss.on("connection", (ws) => {
  activeConnections.add(ws);

  ws.on("close", () => {
    activeConnections.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    activeConnections.delete(ws);
  });
});

const PORT = process.env.PORT || 8002;
server.listen(PORT, () => {
  console.log(`Traffic Management Service running on port ${PORT}`);
});

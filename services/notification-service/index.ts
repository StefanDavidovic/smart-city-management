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

interface Notification {
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

interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
}

const notifications: Map<string, Notification[]> = new Map();
const activeConnections: Set<any> = new Set();
let rabbitConnection: any = null;
let rabbitChannel: any = null;

const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  air_quality_alert: {
    type: "air_quality_alert",
    title: "Air Quality Alert",
    message:
      "Air quality levels are unhealthy in your area. Consider limiting outdoor activities.",
    priority: "high",
  },
  traffic_congestion: {
    type: "traffic_update",
    title: "Traffic Congestion",
    message:
      "Heavy traffic detected on your route. Consider alternative paths.",
    priority: "medium",
  },
  facility_maintenance: {
    type: "facility_update",
    title: "Facility Maintenance",
    message: "Scheduled maintenance will affect facility availability.",
    priority: "low",
  },
  system_maintenance: {
    type: "system_maintenance",
    title: "System Maintenance",
    message: "Scheduled system maintenance will occur tonight from 2-4 AM.",
    priority: "low",
  },
};

class NotificationService {
  static async initializeRabbitMQ(): Promise<void> {
    try {
      const connectionString =
        process.env.RABBITMQ_URL || "amqp://admin:password@localhost:5672";
      rabbitConnection = await amqp.connect(connectionString);
      rabbitChannel = await rabbitConnection.createChannel();

      await rabbitChannel.assertQueue("notifications", { durable: true });
      await rabbitChannel.assertQueue("air_quality_alerts", { durable: true });
      await rabbitChannel.assertQueue("traffic_alerts", { durable: true });
      await rabbitChannel.assertQueue("facility_alerts", { durable: true });

      await this.setupMessageConsumers();

      console.log("RabbitMQ connected successfully");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
    }
  }

  static async setupMessageConsumers(): Promise<void> {
    if (!rabbitChannel) return;

    await rabbitChannel.consume("air_quality_alerts", (msg: any) => {
      if (msg) {
        const alertData = JSON.parse(msg.content.toString());
        this.createAirQualityAlert(alertData);
        rabbitChannel.ack(msg);
      }
    });

    await rabbitChannel.consume("traffic_alerts", (msg: any) => {
      if (msg) {
        const alertData = JSON.parse(msg.content.toString());
        this.createTrafficAlert(alertData);
        rabbitChannel.ack(msg);
      }
    });

    await rabbitChannel.consume("facility_alerts", (msg: any) => {
      if (msg) {
        const alertData = JSON.parse(msg.content.toString());
        this.createFacilityAlert(alertData);
        rabbitChannel.ack(msg);
      }
    });
  }

  static createNotification(
    userId: string | undefined,
    type: string,
    title: string,
    message: string,
    priority: "low" | "medium" | "high" | "critical",
    metadata?: Record<string, any>
  ): Notification {
    const notification: Notification = {
      id: uuidv4(),
      userId,
      type: type as any,
      title,
      message,
      priority,
      timestamp: new Date(),
      read: false,
      metadata,
    };

    if (userId) {
      if (!notifications.has(userId)) {
        notifications.set(userId, []);
      }
      notifications.get(userId)!.push(notification);

      const userNotifications = notifications.get(userId)!;
      if (userNotifications.length > 100) {
        userNotifications.splice(0, userNotifications.length - 100);
      }
    }

    this.broadcastNotification(notification);

    return notification;
  }

  static createAirQualityAlert(alertData: any): void {
    const template = NOTIFICATION_TEMPLATES.air_quality_alert;
    this.createNotification(
      alertData.userId,
      template.type,
      template.title,
      `${template.message} Location: ${alertData.location}`,
      template.priority,
      { sensorId: alertData.sensorId, location: alertData.location }
    );
  }

  static createTrafficAlert(alertData: any): void {
    const template = NOTIFICATION_TEMPLATES.traffic_congestion;
    this.createNotification(
      alertData.userId,
      template.type,
      template.title,
      `${template.message} Location: ${alertData.location}`,
      template.priority,
      { intersectionId: alertData.intersectionId, location: alertData.location }
    );
  }

  static createFacilityAlert(alertData: any): void {
    const template = NOTIFICATION_TEMPLATES.facility_maintenance;
    this.createNotification(
      alertData.userId,
      template.type,
      template.title,
      `${template.message} Facility: ${alertData.facilityName}`,
      template.priority,
      { facilityId: alertData.facilityId, facilityName: alertData.facilityName }
    );
  }

  static broadcastNotification(notification: Notification): void {
    const message = {
      type: "notification",
      data: notification,
      timestamp: new Date().toISOString(),
    };

    activeConnections.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  static getUserNotifications(
    userId: string,
    limit: number = 50
  ): Notification[] {
    const userNotifications = notifications.get(userId) || [];
    return userNotifications.slice(-limit);
  }

  static markNotificationAsRead(
    userId: string,
    notificationId: string
  ): boolean {
    const userNotifications = notifications.get(userId);
    if (!userNotifications) return false;

    const notification = userNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  static markAllAsRead(userId: string): number {
    const userNotifications = notifications.get(userId);
    if (!userNotifications) return 0;

    let count = 0;
    userNotifications.forEach((notification) => {
      if (!notification.read) {
        notification.read = true;
        count++;
      }
    });

    return count;
  }

  static getUnreadCount(userId: string): number {
    const userNotifications = notifications.get(userId) || [];
    return userNotifications.filter((n) => !n.read).length;
  }
}

NotificationService.initializeRabbitMQ();

app.get("/", (req, res) => {
  res.json({
    service: "Notification Service",
    status: "running",
    version: "1.0.0",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "notification-service",
    timestamp: new Date().toISOString(),
    totalNotifications: Array.from(notifications.values()).flat().length,
    activeConnections: activeConnections.size,
    rabbitMQConnected: !!rabbitConnection,
  });
});

app.get("/notifications/:userId", (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const unreadOnly = req.query.unreadOnly === "true";

  let userNotifications = NotificationService.getUserNotifications(
    userId,
    limit
  );

  if (unreadOnly) {
    userNotifications = userNotifications.filter((n) => !n.read);
  }

  res.json({
    notifications: userNotifications,
    unreadCount: NotificationService.getUnreadCount(userId),
    total: userNotifications.length,
  });
});

app.post("/notifications/:userId/read/:notificationId", (req, res) => {
  const { userId, notificationId } = req.params;

  const success = NotificationService.markNotificationAsRead(
    userId,
    notificationId
  );
  if (!success) {
    return res.status(404).json({ error: "Notification not found" });
  }

  res.json({ success: true });
});

app.post("/notifications/:userId/read-all", (req, res) => {
  const { userId } = req.params;

  const count = NotificationService.markAllAsRead(userId);
  res.json({ success: true, markedAsRead: count });
});

app.get("/notifications/:userId/unread-count", (req, res) => {
  const { userId } = req.params;

  const count = NotificationService.getUnreadCount(userId);
  res.json({ unreadCount: count });
});

app.post("/notifications/send", (req, res) => {
  const { userId, type, title, message, priority, metadata } = req.body;

  if (!type || !title || !message || !priority) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const notification = NotificationService.createNotification(
    userId,
    type,
    title,
    message,
    priority,
    metadata
  );

  res.json(notification);
});

app.post("/notifications/broadcast", (req, res) => {
  const { type, title, message, priority, metadata } = req.body;

  if (!type || !title || !message || !priority) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const notification = NotificationService.createNotification(
    undefined, // No specific user
    type,
    title,
    message,
    priority,
    metadata
  );

  res.json(notification);
});

app.get("/templates", (req, res) => {
  res.json(NOTIFICATION_TEMPLATES);
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

  ws.send(
    JSON.stringify({
      type: "connected",
      message: "Connected to notification service",
      timestamp: new Date().toISOString(),
    })
  );
});

process.on("SIGINT", async () => {
  console.log("Shutting down notification service...");

  if (rabbitConnection) {
    await rabbitConnection.close();
  }

  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

const PORT = process.env.PORT || 8004;
server.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});

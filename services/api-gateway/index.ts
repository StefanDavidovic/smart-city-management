import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import axios from "axios";
import { createProxyMiddleware } from "http-proxy-middleware";
import Redis from "ioredis";
import CircuitBreaker from "opossum";
import { v4 as uuidv4 } from "uuid";
import http from "http";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const app = express();
const PORT = process.env.PORT || 8000;

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(REDIS_URL);

const SERVICES = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || "http://auth-service:8005",
    timeout: 5000,
    rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
  },
  airQuality: {
    url:
      process.env.AIR_QUALITY_SERVICE_URL || "http://air-quality-service:8001",
    timeout: 10000,
    rateLimit: { windowMs: 15 * 60 * 1000, max: 200 },
  },
  traffic: {
    url: process.env.TRAFFIC_SERVICE_URL || "http://traffic-service:8002",
    timeout: 10000,
    rateLimit: { windowMs: 15 * 60 * 1000, max: 200 },
  },
  facilities: {
    url: process.env.FACILITIES_SERVICE_URL || "http://facilities-service:8003",
    timeout: 10000,
    rateLimit: { windowMs: 15 * 60 * 1000, max: 200 },
  },
  notifications: {
    url:
      process.env.NOTIFICATION_SERVICE_URL ||
      "http://notification-service:8004",
    timeout: 5000,
    rateLimit: { windowMs: 15 * 60 * 1000, max: 50 },
  },
};

const circuitBreakerOptions = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const circuitBreakers: { [key: string]: any } = {};

Object.keys(SERVICES).forEach((serviceName) => {
  circuitBreakers[serviceName] = new (CircuitBreaker as any)(
    async (url: string) => {
      const response = await axios.get(url, {
        timeout: SERVICES[serviceName as keyof typeof SERVICES].timeout,
      });
      return response.data;
    },
    circuitBreakerOptions
  );

  circuitBreakers[serviceName].on("open", () => {
    console.log(`Circuit breaker for ${serviceName} is OPEN`);
  });

  circuitBreakers[serviceName].on("halfOpen", () => {
    console.log(`Circuit breaker for ${serviceName} is HALF-OPEN`);
  });

  circuitBreakers[serviceName].on("close", () => {
    console.log(`Circuit breaker for ${serviceName} is CLOSED`);
  });
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("combined"));

const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalRateLimit);

const verifyToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const optionalVerifyToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
    } catch (error) {}
  }
  next();
};

const checkServiceHealth = async (
  serviceName: string,
  serviceUrl: string
): Promise<boolean> => {
  try {
    const response = await axios.get(`${serviceUrl}/health`, { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

app.get("/health", async (req, res) => {
  const healthChecks = await Promise.all(
    Object.entries(SERVICES).map(async ([name, config]) => {
      const isHealthy = await checkServiceHealth(name, config.url);
      return {
        service: name,
        status: isHealthy ? "healthy" : "unhealthy",
        url: config.url,
      };
    })
  );

  const allHealthy = healthChecks.every((check) => check.status === "healthy");

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: healthChecks,
    circuitBreakers: Object.keys(circuitBreakers).map((name) => ({
      service: name,
      state: (circuitBreakers[name] as any).state,
    })),
  });
});

app.get("/services", (req, res) => {
  res.json({
    services: Object.entries(SERVICES).map(([name, config]) => ({
      name,
      url: config.url,
      timeout: config.timeout,
      rateLimit: config.rateLimit,
    })),
  });
});

app.use("/api/auth", async (req, res) => {
  try {
    const targetUrl = `${SERVICES.auth.url}${req.url.replace("/api/auth", "")}`;
    console.log(`Proxying ${req.method} ${req.url} to ${targetUrl}`);

    const options = {
      hostname: "auth-service",
      port: 8005,
      path: req.url.replace("/api/auth", ""),
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(JSON.stringify(req.body)),
        ...(req.headers.authorization && {
          Authorization: req.headers.authorization,
        }),
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let data = "";

      proxyRes.on("data", (chunk) => {
        data += chunk;
      });

      proxyRes.on("end", () => {
        res.status(proxyRes.statusCode || 500).json(JSON.parse(data));
        console.log(`Proxy response: ${proxyRes.statusCode} for ${req.url}`);
      });
    });

    proxyReq.on("error", (error) => {
      console.error("Auth service proxy error:", error);
      res.status(503).json({ error: "Authentication service unavailable" });
    });

    proxyReq.write(JSON.stringify(req.body));
    proxyReq.end();
  } catch (error) {
    console.error("Auth service proxy error:", error);
    res.status(503).json({ error: "Authentication service unavailable" });
  }
});

app.use(
  "/api/air-quality",
  optionalVerifyToken,
  createProxyMiddleware({
    target: SERVICES.airQuality.url,
    changeOrigin: true,
    pathRewrite: {
      "^/api/air-quality": "",
    },
    onError: (err, req, res) => {
      console.error("Air Quality service proxy error:", err);
      res.status(503).json({ error: "Air Quality service unavailable" });
    },
  })
);

app.use(
  "/api/traffic",
  optionalVerifyToken,
  createProxyMiddleware({
    target: SERVICES.traffic.url,
    changeOrigin: true,
    pathRewrite: {
      "^/api/traffic": "",
    },
    onError: (err, req, res) => {
      console.error("Traffic service proxy error:", err);
      res.status(503).json({ error: "Traffic service unavailable" });
    },
  })
);

app.use(
  "/api/facilities",
  optionalVerifyToken,
  createProxyMiddleware({
    target: SERVICES.facilities.url,
    changeOrigin: true,
    pathRewrite: {
      "^/api/facilities": "",
    },
    onError: (err, req, res) => {
      console.error("Facilities service proxy error:", err);
      res.status(503).json({ error: "Facilities service unavailable" });
    },
  })
);

app.use(
  "/api/notifications",
  optionalVerifyToken,
  createProxyMiddleware({
    target: SERVICES.notifications.url,
    changeOrigin: true,
    pathRewrite: {
      "^/api/notifications": "",
    },
    onError: (err, req, res) => {
      console.error("Notification service proxy error:", err);
      res.status(503).json({ error: "Notification service unavailable" });
    },
  })
);

app.use(
  "/api/admin",
  verifyToken,
  (req, res, next) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  },
  createProxyMiddleware({
    target: SERVICES.auth.url,
    changeOrigin: true,
    pathRewrite: {
      "^/api/admin": "",
    },
    onError: (err, req, res) => {
      console.error("Admin service proxy error:", err);
      res.status(503).json({ error: "Admin service unavailable" });
    },
  })
);

app.get("/metrics", async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      circuitBreakers: Object.keys(circuitBreakers).map((name) => ({
        service: name,
        state: (circuitBreakers[name] as any).state,
        stats: circuitBreakers[name].stats,
      })),
      redis: {
        connected: redis.status === "ready",
        status: redis.status,
      },
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve metrics" });
  }
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("API Gateway error:", err);
    res.status(500).json({
      error: "Internal server error",
      requestId: req.headers["x-request-id"] || uuidv4(),
    });
  }
);

app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method,
  });
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await redis.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await redis.quit();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log("Available services:", Object.keys(SERVICES));
});

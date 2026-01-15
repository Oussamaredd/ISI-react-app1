// server/src/index.js
import dotenv from 'dotenv';
import express from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import ticketRoutes from "./routes/ticketRoutes.js";
import { pool } from "./config/db.js";
import { initializeDatabase } from "./config/migrations.js";
import register from "./metrics/defaultMetrics.js";
import logger from "./logger/logger.js";
import alertRoute from "./alerts/alertRoute.js";
import "../auth.js"; // Import Passport config
import authRoutes from "./routes/auth.js";
import { attachCurrentUser, requireAuth } from "./middleware/auth.js";
import hotelRoutes from "./routes/hotelRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import ticketDetailsRoutes from "./routes/ticketDetailsRoutes.js";
import adminRoutes from "./routes/admin.js";
import adminHotelRoutes from "./routes/adminHotelRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";
import { globalErrorHandler, notFoundHandler } from "./utils/errorHandler.js";
import { healthCheck, readinessCheck, livenessCheck } from "./auth/health.js";
import { requestLoggingMiddleware } from "./utils/logger.js";
import { createPerformanceMiddleware } from "./middleware/performanceMonitoring.js";
import apiDocsRoutes from "./routes/apiDocsRoutes.js";
dotenv.config({ path: '../../.env' });

const app = express();
const isProduction = process.env.NODE_ENV === "production";

const clientOrigin = process.env.CLIENT_ORIGIN;
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

// CORS CONFIGURATION
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// BODY PARSERS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REQUEST LOGGING
app.use(requestLoggingMiddleware);

// PERFORMANCE MONITORING
const performanceMiddleware = createPerformanceMiddleware();
performanceMiddleware.forEach(middleware => app.use(middleware));

// ENHANCED SECURITY PROTECTION
import { createSecurityMiddleware } from "./middleware/securityEnhancements.js";
const securityMiddleware = createSecurityMiddleware({
  rateLimit: {
    windowMs: 60000,        // 1 minute
    maxRequests: 100,       // 100 requests per minute
    message: 'Too many requests from this IP'
  },
  ddosProtection: {
    enabled: true,
    maxConcurrentConnections: 50,
    suspentionTime: 300000   // 5 minutes
  },
  sqlInjection: true,
  csrfProtection: true,
  inputValidation: true
});

securityMiddleware.forEach(middleware => app.use(middleware));

// SESSION CONFIGURATION
app.use(
  session({
    name: "isi.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      path: "/",
    },
  })
);

// PASSPORT INITIALIZATION
app.use(passport.initialize());
app.use(passport.session());

// Attach currentUser for all routes
app.use(attachCurrentUser);

// ROUTES
app.use("/auth", authRoutes);
app.use("/api/tickets", requireAuth, ticketRoutes);
app.use("/api/tickets", requireAuth, ticketDetailsRoutes); // Add details routes
app.use("/api/hotels", requireAuth, hotelRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/hotels", adminHotelRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api-docs", apiDocsRoutes);

// CACHING MIDDLEWARE
// app.use(CachingService.middleware); // Disabled until CachingService is implemented

// FRONTEND METRICS ENDPOINT
app.post("/api/metrics/frontend", (req, res) => {
  try {
    const { type, name, value, timestamp } = req.body;
    
    console.log('Received frontend metric:', { type, name, value, timestamp });
    
    // Store in performance monitor
    performanceMonitor.recordFrontendMetric({
      type,
      name, 
      value, 
      timestamp
    });
    
    res.status(200).json({ message: 'Metric recorded' });
  } catch (error) {
    console.error('Error recording frontend metric:', error);
    res.status(500).json({ error: 'Failed to record metric' });
  }
});

// DATABASE INITIALIZATION (no more startup table creation hacks)

// HEALTH ENDPOINTS
app.get("/health", healthCheck);
app.get("/healthz", healthCheck); // Kubernetes standard
app.get("/ready", readinessCheck);
app.get("/live", livenessCheck); // Kubernetes liveness

// METRICS ENDPOINT
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});

// LOGGING & ALERTS
logger.info("Backend server starting...", {
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development'
});

app.use("/alert", alertRoute);

// ERROR HANDLING (must be last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

// START SERVER
const startServer = async () => {
  if (!process.env.SESSION_SECRET) {
    console.error(
      "Missing SESSION_SECRET (set it in server/.env.local or container env)"
    );
    process.exit(1);
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn(
      "Google OAuth not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET). Login will not work."
    );
  }

  await initializeDatabase();

  const PORT = parseInt(process.env.PORT) || 5000;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });
};

// Export app for testing
export { app };

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

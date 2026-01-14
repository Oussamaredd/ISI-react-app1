// server/src/index.js
import dotenv from 'dotenv';
import express from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import ticketRoutes from "./routes/ticketRoutes.js";
import { pool } from "./config/db.js";
import register from "./metrics/defaultMetrics.js";
import logger from "./logger/logger.js";
import alertRoute from "./alerts/alertRoute.js";
import "../auth.js"; // Import Passport config
import authRoutes from "./routes/auth.js";
import { attachCurrentUser, requireAuth } from "./middleware/auth.js";
import hotelRoutes from "./routes/hotelRoutes.js";
dotenv.config({ path: '../.env' });

const app = express();
const isProduction = process.env.NODE_ENV === "production";

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const corsOrigins =
  (process.env.CORS_ORIGINS || `${clientOrigin},http://localhost:3000`)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

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
app.use("/api/hotels", requireAuth, hotelRoutes);

// ENSURE TICKETS TABLE IN DATABASE
const ensureTicketsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price NUMERIC(10, 2) NOT NULL
      );
    `);

    // Keep schema aligned with code paths that expect these columns
    await pool.query(
      `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'OPEN';`
    );
    await pool.query(
      `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS hotel_id INTEGER;`
    );
    console.log("ƒo. Table 'tickets' is ready");
  } catch (err) {
    console.error("ƒ?O Error creating tickets table:", err);
  }
};

// ENSURE USERS TABLE IN DATABASE
const ensureUsersTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log("ƒo. Table 'users' is ready");
  } catch (err) {
    console.error("ƒ?O Error creating users table:", err);
  }
};

// ENSURE HOTELS TABLE IN DATABASE
const ensureHotelsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hotels (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);
    console.log("ƒo. Table 'hotels' is ready");
  } catch (err) {
    console.error("ƒ?O Error creating hotels table:", err);
  }
};

// METRICS ENDPOINT
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});

// LOGGING & ALERTS
logger.info("ÐYs? Backend server starting...");
logger.info("Test log from API /api/tickets");
app.use("/alert", alertRoute);

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

  await ensureTicketsTable();
  await ensureUsersTable();
  await ensureHotelsTable();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`ÐYs? Server running on port ${PORT}`));
};

startServer();

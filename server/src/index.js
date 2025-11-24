// server/src/index.js
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

const app = express();
const isProduction = process.env.NODE_ENV === "production"; // Determine environment

// CORS CONFIGURATION
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

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
      secure: isProduction, // true only in HTTPS
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
app.use("/api/tickets", requireAuth, ticketRoutes); // Protect ticket routes with requireAuth
app.use("/api/hotels", requireAuth, hotelRoutes); // Protect hotel routes with requireAuth

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
    console.log("✅ Table 'tickets' is ready");
  } catch (err) {
    console.error("❌ Error creating tickets table:", err);
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
    console.log("✅ Table 'users' is ready");
  } catch (err) {
    console.error("❌ Error creating users table:", err);
  }
};

// METRICS ENDPOINT
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});

// LOGGING & ALERTS
logger.info("🚀 Backend server starting...");
logger.info("Test log from API /api/tickets");
app.use("/alert", alertRoute);

// START SERVER
const startServer = async () => {
  await ensureTicketsTable();
  await ensureUsersTable();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();

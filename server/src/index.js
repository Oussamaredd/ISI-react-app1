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

const app = express();

// CORS CONFIGURATION
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

// BODY PARSERS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESSION CONFIGURATION
const isProduction = process.env.NODE_ENV === "production";

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

// ROUTES
app.use("/api/tickets", ticketRoutes);
import authRoutes from "./routes/auth.js";
app.use("/auth", authRoutes);

// DATABASE TABLE CHECK
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
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();

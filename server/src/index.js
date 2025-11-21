// server/src/index.js
import express from "express";
import cors from "cors";
import ticketRoutes from "./routes/ticketRoutes.js";
import { pool } from "./config/db.js";
import register from "./metrics/defaultMetrics.js";
import logger from "./logger/logger.js";
import alertRoute from "./alerts/alertRoute.js";


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); //middleware optional

// Routes
app.use("/api/tickets", ticketRoutes);

// --- Ensure DB Table ---
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

// --- Metrics Endpoint ---
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});

// --- Logger Test Endpoint ---
logger.info("🚀 Backend server starting...");
logger.info("Test log from API /api/tickets");

// --- Telegram Alert Test ---
app.use("/alert", alertRoute);

// --- Start Server ---
const startServer = async () => {
  await ensureTicketsTable();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();

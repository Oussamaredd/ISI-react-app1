import express from "express";
import cors from "cors";
import ticketRoutes from "./routes/ticketRoutes.js";
import { pool } from "./config/db.js";

const app = express();
app.use(cors());
app.use(express.json());

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

// --- Start Server ---
const startServer = async () => {
  await ensureTicketsTable();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();

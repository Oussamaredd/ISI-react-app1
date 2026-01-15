import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// fetch all hotels
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, is_available FROM hotels ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching hotels:", err);
    res.sendStatus(500);
  }
});

// fetch only available hotels
router.get("/available", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM hotels WHERE is_available = TRUE ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching available hotels:", err);
    res.sendStatus(500);
  }
});

export default router;

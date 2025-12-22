import express from "express";
import { sendTelegramAlert } from "./sendTelegramAlert.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    await sendTelegramAlert(message);
    res.json({ status: "ok", message: "Alert sent" });
  } catch (err) {
    console.error("❌ Telegram send error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

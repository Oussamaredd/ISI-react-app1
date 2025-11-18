import express from "express";
import {
  getAllTickets,
  addTicket,
  editTicket,
  removeTicket,
} from "../controllers/ticketController.js";

const router = express.Router();

router.get("/", getAllTickets);
router.post("/", addTicket);
router.put("/:id", editTicket);
router.delete("/:id", removeTicket);

router.get("/", async (req, res) => {
  try {
    logger.info("Fetching tickets...");
    const result = await pool.query("SELECT * FROM tickets");

    logger.info("Tickets fetched", { count: result.rows.length });
    res.json(result.rows);
  } catch (err) {
    logger.error("Error fetching tickets", { error: err.message });
    res.status(500).json({ error: "Internal Server Error" });
  }
});


export default router;

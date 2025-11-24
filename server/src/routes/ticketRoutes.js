// server/src/routes/ticketRoutes.js
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

router.get("/", 
  async (req, res) => {
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

router.post("/:id/assign-hotel", async (req, res) => {
  const ticketId = Number(req.params.id);
  const { hotelId } = req.body;

  if (!ticketId || !hotelId) {
    return res.status(400).json({ error: "ticketId or hotelId missing" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Validate ticket exists + OPEN
    const tRes = await client.query(
      "SELECT id, status FROM tickets WHERE id = $1 FOR UPDATE",
      [ticketId]
    );
    const ticket = tRes.rows[0];
    if (!ticket) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Ticket not found" });
    }
    if (ticket.status === "COMPLETED") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Ticket already completed" });
    }

    // 2) Validate hotel exists + available
    const hRes = await client.query(
      "SELECT id, is_available FROM hotels WHERE id = $1 FOR UPDATE",
      [hotelId]
    );
    const hotel = hRes.rows[0];
    if (!hotel) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Hotel not found" });
    }
    if (!hotel.is_available) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Hotel not available" });
    }

    // 3) Assign hotel to ticket + mark COMPLETED
    const updatedTicketRes = await client.query(
      `
      UPDATE tickets
      SET hotel_id = $1, status = 'COMPLETED'
      WHERE id = $2
      RETURNING id, name, price, status, hotel_id
      `,
      [hotelId, ticketId]
    );

    // 4) Mark hotel unavailable
    const updatedHotelRes = await client.query(
      `
      UPDATE hotels
      SET is_available = FALSE
      WHERE id = $1
      RETURNING id, name, is_available
      `,
      [hotelId]
    );

    await client.query("COMMIT");

    res.json({
      ticket: updatedTicketRes.rows[0],
      hotel: updatedHotelRes.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error assigning hotel:", err);
    res.sendStatus(500);
  } finally {
    client.release();
  }
});

export default router;

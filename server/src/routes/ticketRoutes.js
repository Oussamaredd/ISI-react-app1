// server/src/routes/ticketRoutes.js
import express from "express";
import {
  getAllTickets,
  addTicket,
  editTicket,
  removeTicket,
  assignHotelToTicket, // new controller we add in ticketController.js
} from "../controllers/ticketController.js";

const router = express.Router();

// CRUD routes
router.get("/", getAllTickets);
router.post("/", addTicket);
router.put("/:id", editTicket);
router.delete("/:id", removeTicket);

// Assign hotel to ticket
router.post("/:id/assign-hotel", assignHotelToTicket);

export default router;

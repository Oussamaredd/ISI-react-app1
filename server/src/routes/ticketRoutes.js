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

export default router;

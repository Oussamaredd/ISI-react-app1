// server/src/controllers/ticketController.js
import {
  getTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  assignHotelToTicket,
  getTicketById
} from "../models/ticketModel.js";

export async function getAllTickets(req, res) {
  try {
    const tickets = await getTickets(); 
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addTicket(req, res) {
  try {
    const { name, price } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: "name and price are required" });
    }

    const newTicket = await createTicket(name, price);
    res.status(201).json(newTicket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function editTicket(req, res) {
  try {
    const { id } = req.params;
    const { name, price } = req.body;

    const updated = await updateTicket(id, name, price);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function removeTicket(req, res) {
  try {
    const { id } = req.params;
    const result = await deleteTicket(id);
    res.json(result);
  } catch (err) {
    if (err.message === "Ticket not found") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
}

// New controller to assign hotel to ticket
export async function assignHotelToTicket(req, res) {
  try {
    const ticketId = Number(req.params.id);
    const { hotelId } = req.body;

    if (!ticketId || !hotelId) {
      return res.status(400).json({ error: "ticketId or hotelId missing" });
    }

    const result = await assignHotelToTicketModel(ticketId, hotelId);
    res.json(result);
  } catch (err) {
    // model throws meaningful errors → map to proper HTTP codes
    if (err.message === "Ticket not found") return res.status(404).json({ error: err.message });
    if (err.message === "Hotel not found") return res.status(404).json({ error: err.message });
    if (err.message === "Ticket already completed") return res.status(400).json({ error: err.message });
    if (err.message === "Hotel not available") return res.status(400).json({ error: err.message });
    
    res.status(500).json({ error: err.message });
  }
}

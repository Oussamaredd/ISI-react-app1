import {
  getTickets,
  createTicket,
  updateTicket,
  deleteTicket,
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
    await deleteTicket(id);
    res.json({ message: "Ticket deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

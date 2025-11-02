import React, { useContext, useState } from "react";
import { TicketsContext } from "../context/Tickets";

export default function CreateTicket() {
  const context = useContext(TicketsContext);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");

  if (!context) return null;
  const { addTicket } = context;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;
    addTicket({ title, price: parseFloat(price) });
    setTitle("");
    setPrice("");
  };

  return (
    <form onSubmit={handleSubmit}   className="create-form">
      <input
        type="text"
        placeholder="Ticket name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="number"
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <button type="submit">Add Ticket</button>
    </form>
  );
}

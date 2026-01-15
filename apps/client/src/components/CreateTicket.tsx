// client/src/components/CreateTicket.tsx
import React, { useState } from "react";
import { useTickets } from "../hooks/useTickets";

interface CreateTicketProps {
  onSuccess?: () => void;
}

export default function CreateTicket({ onSuccess }: CreateTicketProps) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const { createTicket, isCreating } = useTickets();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || isCreating) return;
    
    try {
      await createTicket({ 
        name: title.trim(), 
        price: Number.parseFloat(price) 
      });

      // Clear form fields on success
      setTitle("");
      setPrice("");

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Error is handled by React Query with toast notifications
      console.error('Create ticket error caught by component:', error);
    }
  };

  // Client-side validation
  const isValid = title.trim().length > 0 && price && Number.parseFloat(price) >= 0;

  return (
    <div>
      <form onSubmit={handleSubmit} className="create-form">
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="title" style={{ display: "block", marginBottom: "0.25rem", fontWeight: "500" }}>
            Ticket Name
          </label>
          <input
            id="title"
            type="text"
            placeholder="Enter ticket name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isCreating}
            required
            style={{ 
              width: "100%", 
              padding: "0.5rem", 
              fontSize: "1rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: isCreating ? "#f8f9fa" : "white"
            }}
          />
        </div>
        
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="price" style={{ display: "block", marginBottom: "0.25rem", fontWeight: "500" }}>
            Price ($)
          </label>
          <input
            id="price"
            type="number"
            placeholder="Enter price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={isCreating}
            step="0.01"
            min="0"
            required
            style={{ 
              width: "100%", 
              padding: "0.5rem", 
              fontSize: "1rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: isCreating ? "#f8f9fa" : "white"
            }}
          />
        </div>

        <button 
          type="submit" 
          disabled={!isValid || isCreating}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: (!isValid || isCreating) ? "#6c757d" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: (!isValid || isCreating) ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {isCreating ? "Creating..." : "Create Ticket"}
        </button>
      </form>
    </div>
  );
}

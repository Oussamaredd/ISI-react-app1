// client/src/components/CreateTicket.tsx
import React, { useState } from "react";
import { useCreateTicket } from "../hooks/useTickets";

interface CreateTicketProps {
  onSuccess?: () => void;
}

export default function CreateTicket({ onSuccess }: CreateTicketProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const createTicketMutation = useCreateTicket();
  const { isPending: isCreating } = createTicketMutation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;
    
    try {
      await createTicketMutation.mutateAsync({ 
        name: title.trim(), 
        description: description.trim(),
        priority 
      });

      // Clear form fields on success
      setTitle("");
      setDescription("");
      setPriority("medium");

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
  const isValid = title.trim().length > 0;

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
          <label htmlFor="description" style={{ display: "block", marginBottom: "0.25rem", fontWeight: "500" }}>
            Description
          </label>
          <textarea
            id="description"
            placeholder="Enter ticket description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isCreating}
            rows={4}
            style={{ 
              width: "100%", 
              padding: "0.5rem", 
              fontSize: "1rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: isCreating ? "#f8f9fa" : "white",
              resize: "vertical"
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="priority" style={{ display: "block", marginBottom: "0.25rem", fontWeight: "500" }}>
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
            disabled={isCreating}
            style={{ 
              width: "100%", 
              padding: "0.5rem", 
              fontSize: "1rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: isCreating ? "#f8f9fa" : "white"
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
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

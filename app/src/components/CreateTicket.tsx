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
        priority,
      });

      setTitle("");
      setDescription("");
      setPriority("medium");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Create ticket error caught by component:", error);
    }
  };

  const isValid = title.trim().length > 0;

  return (
    <div>
      <form onSubmit={handleSubmit} className="create-form">
        <div className="create-field">
          <label htmlFor="title" className="create-label">
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
            className="create-input"
          />
        </div>

        <div className="create-field">
          <label htmlFor="description" className="create-label">
            Description
          </label>
          <textarea
            id="description"
            placeholder="Enter ticket description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isCreating}
            rows={4}
            className="create-input create-textarea"
          />
        </div>

        <div className="create-field">
          <label htmlFor="priority" className="create-label">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
            disabled={isCreating}
            className="create-input"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <button type="submit" disabled={!isValid || isCreating} className="create-submit">
          {isCreating ? "Creating..." : "Create Ticket"}
        </button>
      </form>
    </div>
  );
}

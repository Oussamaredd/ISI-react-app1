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
  const [supportCategory, setSupportCategory] = useState<
    | "general_help"
    | "container_overflow"
    | "collection_delay"
    | "damaged_container"
    | "route_request"
    | "billing"
    | "other"
  >("general_help");
  const [createError, setCreateError] = useState<string | null>(null);
  const createTicketMutation = useCreateTicket();
  const { isPending: isCreating } = createTicketMutation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) {
      return;
    }

    setCreateError(null);

    try {
      await createTicketMutation.mutateAsync({
        name: title.trim(),
        description: description.trim(),
        priority,
        supportCategory,
      });

      setTitle("");
      setDescription("");
      setPriority("medium");
      setSupportCategory("general_help");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create ticket right now. Please retry.";
      setCreateError(message);
    }
  };

  const isValid = title.trim().length > 0;

  return (
    <div className="create-shell">
      <form onSubmit={handleSubmit} className="create-form">
        {createError ? (
          <p role="alert" className="create-error">
            {createError}
          </p>
        ) : null}

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
          <p className="create-hint">
            Use a short and specific title so agents can triage faster.
          </p>
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
          <p className="create-hint">
            Include context, observed impact, and expected resolution.
          </p>
        </div>

        <div className="create-field">
          <label htmlFor="supportCategory" className="create-label">
            Support Category
          </label>
          <select
            id="supportCategory"
            value={supportCategory}
            onChange={(e) =>
              setSupportCategory(
                e.target.value as
                  | "general_help"
                  | "container_overflow"
                  | "collection_delay"
                  | "damaged_container"
                  | "route_request"
                  | "billing"
                  | "other"
              )
            }
            disabled={isCreating}
            className="create-input"
          >
            <option value="general_help">General Help</option>
            <option value="container_overflow">Container Overflow</option>
            <option value="collection_delay">Collection Delay</option>
            <option value="damaged_container">Damaged Container</option>
            <option value="route_request">Route Request</option>
            <option value="billing">Billing</option>
            <option value="other">Other</option>
          </select>
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

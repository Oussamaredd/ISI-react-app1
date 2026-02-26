import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdvancedTicketList from "./AdvancedTicketList";
import TicketList from "../components/TicketList";
import CreateTicket from "../components/CreateTicket";
import "../styles/SupportPage.css";
import "../styles/TicketList.css";
import "../styles/CreateTickets.css";

type SupportView = "advanced" | "simple" | "create";

const DEFAULT_VIEW: SupportView = "advanced";

const SUPPORT_VIEWS: Array<{
  id: SupportView;
  label: string;
  description: string;
}> = [
  {
    id: "advanced",
    label: "Advanced",
    description: "Triage and filter the full ticket queue.",
  },
  {
    id: "simple",
    label: "Simple",
    description: "Use a compact queue for quick ticket actions.",
  },
  {
    id: "create",
    label: "Create",
    description: "Open a new support ticket without leaving this page.",
  },
];

const viewToHash = (view: SupportView) => `#${view}`;

const hashToView = (hash: string): SupportView => {
  const normalizedHash = hash.trim().toLowerCase();
  if (normalizedHash === "#simple") {
    return "simple";
  }
  if (normalizedHash === "#create") {
    return "create";
  }
  if (normalizedHash === "#advanced") {
    return "advanced";
  }
  return DEFAULT_VIEW;
};

export default function SupportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeView = React.useMemo(
    () => hashToView(location.hash),
    [location.hash],
  );

  const setView = (nextView: SupportView) => {
    const nextHash = viewToHash(nextView);
    if (location.pathname === "/app/support" && location.hash === nextHash) {
      return;
    }

    navigate(
      {
        pathname: "/app/support",
        hash: nextHash,
      },
      { replace: true },
    );
  };

  return (
    <section className="support-workspace-page">
      <header className="support-workspace-hero">
        <p className="support-workspace-eyebrow">Support Operations</p>
        <h1>Support Workspace</h1>
        <p>
          Keep intake, triage, and follow-up in one place to reduce context
          switching for support teams.
        </p>
      </header>

      <nav className="support-workspace-tabs" aria-label="Support views">
        {SUPPORT_VIEWS.map((view) => {
          const isActive = activeView === view.id;
          return (
            <button
              key={view.id}
              id={`support-tab-${view.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`support-panel-${view.id}`}
              className={
                isActive
                  ? "support-workspace-tab support-workspace-tab-active"
                  : "support-workspace-tab"
              }
              onClick={() => setView(view.id)}
            >
              <span>{view.label}</span>
              <small>{view.description}</small>
            </button>
          );
        })}
      </nav>

      <section
        id={`support-panel-${activeView}`}
        role="tabpanel"
        aria-labelledby={`support-tab-${activeView}`}
        className="support-workspace-panel"
      >
        {activeView === "advanced" ? (
          <AdvancedTicketList />
        ) : null}

        {activeView === "simple" ? (
          <div className="support-workspace-card">
            <h2>Simple Ticket Queue</h2>
            <p>
              A lightweight list for fast handling and one-click ticket actions.
            </p>
            <TicketList />
          </div>
        ) : null}

        {activeView === "create" ? (
          <div className="support-workspace-card">
            <h2>Create Support Ticket</h2>
            <p>Capture new requests without leaving the support workflow.</p>
            <CreateTicket onSuccess={() => setView("simple")} />
          </div>
        ) : null}
      </section>
    </section>
  );
}

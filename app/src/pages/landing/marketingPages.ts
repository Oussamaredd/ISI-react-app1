export type MarketingPageKey =
  | "about"
  | "contact"
  | "security"
  | "features"
  | "howItWorks"
  | "pricing"
  | "support"
  | "terms"
  | "privacy"
  | "cookies";

type PageCta = {
  label: string;
  href: string;
};

type SectionBase = {
  title: string;
  description?: string;
};

type HighlightItem = {
  label: string;
  value: string;
  note: string;
};

type CardGridItem = {
  title: string;
  description: string;
  bullets?: string[];
  meta?: string;
};

type TimelineItem = {
  title: string;
  detail: string;
  owner?: string;
  window?: string;
};

type MatrixRow = {
  label: string;
  values: string[];
};

type FaqItem = {
  question: string;
  answer: string;
};

export type MarketingPageSection =
  | (SectionBase & { kind: "highlights"; items: HighlightItem[] })
  | (SectionBase & { kind: "cardGrid"; columns?: 2 | 3; items: CardGridItem[] })
  | (SectionBase & { kind: "timeline"; items: TimelineItem[] })
  | (SectionBase & { kind: "matrix"; columns: string[]; rows: MatrixRow[] })
  | (SectionBase & { kind: "checklist"; items: string[]; footnote?: string })
  | (SectionBase & { kind: "faq"; items: FaqItem[] });

export type MarketingPageContent = {
  key: MarketingPageKey;
  path: string;
  href: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  quickFacts: string[];
  primaryCta: PageCta;
  secondaryCta: PageCta;
  lastUpdated: string;
  sections: MarketingPageSection[];
};

const LAST_UPDATED = "March 28, 2026";

export const MARKETING_PAGES: Record<MarketingPageKey, MarketingPageContent> = {
  about: {
    key: "about",
    path: "about",
    href: "/about",
    label: "About",
    eyebrow: "Product",
    title: "Built to demonstrate citizen-first collection coordination",
    description:
      "EcoTrack is a software-only school prototype for the Paris scenario, combining citizen reporting, manager coordination, agent validation, and simulated measurement support in one product story.",
    quickFacts: ["Citizen reporting", "Manager coordination", "Simulated measurement support"],
    primaryCta: { label: "View features", href: "/features" },
    secondaryCta: { label: "Contact EcoTrack", href: "/contact" },
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        kind: "highlights",
        title: "What EcoTrack brings together",
        items: [
          {
            label: "Operational inputs",
            value: "Citizen + simulated measurement + crew",
            note: "Combine citizen reports, seeded measurement context, and field updates in one operational surface.",
          },
          {
            label: "Planning context",
            value: "Zones, tours, and risk",
            note: "Turn raw signals into actionable priorities for managers, dispatchers, and supervisors.",
          },
          {
            label: "Verified follow-through",
            value: "Track the full round",
            note: "Keep assignments, stop validation, and operational history connected from start to finish.",
          },
        ],
      },
      {
        kind: "cardGrid",
        columns: 3,
        title: "Who the prototype centers",
        description: "The product story stays grounded in the roles already implemented in the repo.",
        items: [
          {
            title: "Citizens",
            description: "Report container issues and follow the limited but truthful operational feedback loop already implemented in the prototype.",
            bullets: ["Report submission", "Status and impact follow-up"],
          },
          {
            title: "Managers and admins",
            description: "Use the primary desktop workspaces for monitoring, planning, reporting, and oversight.",
            bullets: ["Manager dashboard and planning", "Admin governance"],
          },
          {
            title: "Agents",
            description: "Validate collection work and anomalies, with mobile-first execution supported by a retained web companion flow.",
            bullets: ["Tour execution", "Stop validation and anomaly reporting"],
          },
        ],
      },
      {
        kind: "timeline",
        title: "Typical rollout path",
        items: [
          {
            title: "Week 1: Map the operation",
            detail: "Confirm zones, containers, reporting channels, and the teams responsible for daily collection work.",
            owner: "EcoTrack + customer operations lead",
          },
          {
            title: "Week 2: Configure workflows",
            detail: "Set roles, service areas, alerts, and route-planning defaults for the first live service area.",
            owner: "Platform admin",
          },
          {
            title: "Week 3: Pilot one service area",
            detail: "Run live tours, citizen intake, and monitoring with one district, campus, or contract footprint.",
            owner: "Operations manager",
            window: "5-7 business days",
          },
          {
            title: "Week 4: Expand coverage",
            detail: "Bring remaining teams online with dashboards, support routines, and repeatable reporting in place.",
            owner: "Program owner",
          },
        ],
      },
    ],
  },
  contact: {
    key: "contact",
    path: "contact",
    href: "/contact",
    label: "Contact",
    eyebrow: "Company",
    title: "Reach the EcoTrack team that can move work forward",
    description:
      "Talk to EcoTrack about rollout planning, platform support, or security and procurement questions. Every request is routed to an accountable owner.",
    quickFacts: ["Sales and rollout", "Technical enablement", "Priority support"],
    primaryCta: { label: "View support model", href: "/support" },
    secondaryCta: { label: "Back to landing", href: "/" },
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        kind: "cardGrid",
        columns: 3,
        title: "Contact channels",
        items: [
          {
            title: "Sales and rollout",
            description: "For evaluations, pilot planning, rollout design, and platform scoping.",
            bullets: ["Discovery workshops", "Deployment planning", "Commercial support"],
            meta: "Business hours",
          },
          {
            title: "Customer support",
            description: "For live workspace questions, troubleshooting, and operational workflow guidance.",
            bullets: ["Issue triage", "Configuration help", "Escalation checks"],
            meta: "24/7 intake",
          },
          {
            title: "Security and procurement",
            description: "For vendor reviews, questionnaires, and formal policy or legal requests.",
            bullets: ["Security documentation", "Control clarifications", "Audit coordination"],
            meta: "Named response owner",
          },
        ],
      },
      {
        kind: "matrix",
        title: "Service windows",
        columns: ["Coverage", "Target first response", "Best used for"],
        rows: [
          { label: "General inquiry", values: ["Mon-Fri", "1 business day", "Evaluations, rollout planning, and procurement"] },
          { label: "Support request", values: ["24/7 intake", "< 4 hours", "Live workspace questions and issue investigation"] },
          { label: "Critical incident", values: ["24/7 priority", "< 30 minutes", "Production-impacting outages"] },
        ],
      },
      {
        kind: "checklist",
        title: "Send this context with your request",
        description: "A little context up front helps us route your request faster.",
        items: [
          "Organization, municipality, or service area involved",
          "The problem you are solving or the issue you are seeing",
          "Relevant systems such as citizen reports, sensors, tours, or dashboards",
          "Your timing, urgency, and desired outcome",
        ],
      },
    ],
  },
  security: {
    key: "security",
    path: "security",
    href: "/security",
    label: "Security",
    eyebrow: "Trust",
    title: "Security and operational safeguards built into EcoTrack",
    description:
      "EcoTrack uses role-scoped access, controlled change management, and production safeguards so collection operations stay reliable and accountable.",
    quickFacts: ["Role-based access", "Controlled releases", "Operational resilience"],
    primaryCta: { label: "Contact security", href: "/contact" },
    secondaryCta: { label: "Read privacy", href: "/privacy" },
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        kind: "cardGrid",
        columns: 2,
        title: "Security control areas",
        items: [
          {
            title: "Identity and access",
            description: "Authenticated access is scoped by role so teams only see the operational surfaces they are allowed to use.",
            bullets: ["Role-aware authorization", "Administrative access controls", "Session management rules"],
          },
          {
            title: "Application controls",
            description: "Routes, service logic, and environment policy checks protect the platform from unsafe or mis-scoped behavior.",
            bullets: ["Guarded privileged routes", "Input validation", "Environment safety checks"],
          },
          {
            title: "Operational monitoring",
            description: "Release and incident workflows keep production changes visible, reviewable, and easier to recover from.",
            bullets: ["Release checkpoints", "Rollback readiness", "Post-incident reviews"],
          },
          {
            title: "Data governance",
            description: "Operational data is handled with access scoping, documented workflows, and customer-aligned retention behavior.",
            bullets: ["Purpose-limited processing", "Access scoping", "Audit-friendly change history"],
          },
        ],
      },
      {
        kind: "timeline",
        title: "Incident handling lifecycle",
        items: [
          { title: "Detect", detail: "Signals from monitoring, customer reports, or internal checks are triaged immediately.", window: "Immediate" },
          { title: "Contain", detail: "A responsible owner is assigned and the affected workflow is isolated or stabilized.", window: "< 60 minutes" },
          { title: "Communicate", detail: "Stakeholders receive updates based on business impact, severity, and mitigation status.", owner: "Incident commander" },
          { title: "Recover", detail: "Service integrity is restored and observed through a stabilization window.", window: "Severity dependent" },
          { title: "Review", detail: "Root cause, corrective actions, and follow-through are documented after recovery.", window: "Within 5 business days" },
        ],
      },
      {
        kind: "faq",
        title: "Security FAQ",
        items: [
          {
            question: "How are privileged actions protected?",
            answer: "Administrative actions are protected by role-based permissions and environment-aware safeguards.",
          },
          {
            question: "Do you support security questionnaires?",
            answer: "Yes. Submit questionnaire requests through the contact page and include your review timeline.",
          },
          {
            question: "How do you communicate production incidents?",
            answer: "Incidents follow severity-driven communication with updates based on current impact and recovery status.",
          },
        ],
      },
    ],
  },
  features: {
    key: "features",
    path: "features",
    href: "/features",
    label: "Features",
    eyebrow: "Product",
    title: "Citizen-first reporting with an operational backbone",
    description:
      "EcoTrack connects citizen intake, manager coordination, agent execution, and simulated measurement support in one coherent prototype.",
    quickFacts: ["Citizen-first reporting", "Role-based coordination", "Simulated measurement support"],
    primaryCta: { label: "View prototype scope", href: "/pricing" },
    secondaryCta: { label: "How it works", href: "/how-it-works" },
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        kind: "cardGrid",
        columns: 3,
        title: "Core feature areas",
        items: [
          {
            title: "Citizen reporting",
            description: "Capture overflow, missed collection, and damaged-container reports in a structured intake flow.",
            bullets: ["Clean report metadata", "Clear ownership and triage"],
          },
          {
            title: "Simulated measurement support",
            description: "Bring seeded or simulated measurement context into the same workspace managers use for daily decisions.",
            bullets: ["Context enrichment", "Future-ready ingestion seam"],
          },
          {
            title: "Tour planning",
            description: "Turn zone risk and operational load into practical collection tours and assignments.",
            bullets: ["Zone-aware planning", "Route-ready assignments"],
          },
          {
            title: "Field execution",
            description: "Keep crews aligned on stops, validation, and completion updates during active rounds.",
            bullets: ["Stop-by-stop progress", "Verified collection actions"],
          },
          {
            title: "Citizen follow-up visibility",
            description: "Show report status, resolved totals, and prototype impact visibility without inventing unseen operational states.",
            bullets: ["History and status", "Prototype impact view"],
          },
          {
            title: "Reporting and governance",
            description: "Track performance, support audit requirements, and manage access from one platform.",
            bullets: ["Trend reporting", "Role and policy controls"],
          },
        ],
      },
      {
        kind: "highlights",
        title: "Platform strengths",
        items: [
          {
            label: "Operational signals",
            value: "Citizen reports lead",
            note: "Citizen reports are the primary signal today, with simulated measurements and crew updates as support.",
          },
          {
            label: "Manager visibility",
            value: "Manager desktop visibility",
            note: "Dashboards and planning surfaces keep the primary desktop workspace aligned to the right roles.",
          },
          {
            label: "Shared audit trail",
            value: "One timeline",
            note: "Assignments, validations, and updates remain connected from intake to completion.",
          },
        ],
      },
      {
        kind: "matrix",
        title: "Coverage by role",
        columns: ["Citizen", "Agent", "Manager/Admin"],
        rows: [
          { label: "Report issues or exceptions", values: ["Primary", "View assigned context", "Review and prioritize"] },
          { label: "Execute collection rounds", values: ["View service status", "Primary", "Monitor progress"] },
          { label: "Track performance and risk", values: ["View own reports", "Contribute updates", "Primary"] },
        ],
      },
    ],
  },
  howItWorks: {
    key: "howItWorks",
    path: "how-it-works",
    href: "/how-it-works",
    label: "How it works",
    eyebrow: "Product",
    title: "How EcoTrack turns citizen signals into collection action",
    description:
      "EcoTrack follows a repeatable flow so citizen reporting, manager prioritization, and field validation stay connected.",
    quickFacts: ["Citizen-first signal", "Manager coordination", "Validated collection"],
    primaryCta: { label: "View prototype scope", href: "/pricing" },
    secondaryCta: { label: "Contact EcoTrack", href: "/contact" },
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        kind: "timeline",
        title: "EcoTrack operating flow",
        description: "Each stage keeps citizens, operations leads, and field crews aligned around the same prototype workflow.",
        items: [
          { title: "1. Report", detail: "A citizen submits a typed issue on an existing mapped container.", owner: "Citizen" },
          { title: "2. Prioritize", detail: "Managers review the citizen signal first, with simulated measurements adding supporting context where available.", owner: "Operations lead" },
          { title: "3. Plan", detail: "Tours and assignments are generated for the right agent and time window.", owner: "Planning coordinator" },
          { title: "4. Execute", detail: "Agents follow stops, validate work, and record collection context in the workflow.", owner: "Agent" },
          { title: "5. Follow up", detail: "Citizens see the available status, resolved totals, and current prototype impact visibility.", owner: "Citizen + manager" },
        ],
      },
      {
        kind: "matrix",
        title: "Operational states",
        columns: ["What it means", "Expected action", "Escalation trigger"],
        rows: [
          { label: "Detected", values: ["A new signal or report has been captured", "Assess priority and service impact", "Repeated complaints or unresolved hotspot"] },
          { label: "Planned", values: ["Work is scheduled into a route or assignment", "Confirm crew, route, and timing", "Missed service window or missing assignee"] },
          { label: "In field", values: ["Collection work is actively underway", "Validate stops and update progress", "Stalled tour or blocked stop"] },
          { label: "Verified", values: ["Work is complete and reviewed", "Confirm outcome and lessons learned", "Issue reopens or trend persists"] },
        ],
      },
      {
        kind: "checklist",
        title: "First prototype walkthrough plan",
        items: [
          "Map zones, containers, and the reporting channels that feed operations",
          "Define roles, alerts, and service priorities for the demo area",
          "Run one district or campus walkthrough with planned tours",
          "Review dashboards and tune routes, thresholds, and handoff rules",
        ],
        footnote: "Most teams start with one focused service area, then expand once the workflow is stable.",
      },
    ],
  },
  pricing: {
    key: "pricing",
    path: "pricing",
    href: "/pricing",
    label: "Scope",
    eyebrow: "Prototype",
    title: "Prototype scope and boundaries",
    description:
      "EcoTrack is currently a school prototype, not a commercial pricing sheet. This page explains what is implemented now, how roles are split, and what remains future-ready only.",
    quickFacts: ["Implemented now", "Role split", "Future-ready later"],
    primaryCta: { label: "Open EcoTrack", href: "/login" },
    secondaryCta: { label: "Read support guidance", href: "/support" },
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        kind: "cardGrid",
        columns: 3,
        title: "Current scope snapshot",
        items: [
          {
            title: "Implemented now",
            meta: "Current repo reality",
            description: "Citizen reports, manager planning, agent tours, admin controls, auth, and realtime updates are already implemented.",
            bullets: ["Citizen reporting", "Manager dashboard and planning", "Agent validation"],
          },
          {
            title: "Role split",
            meta: "Current UX direction",
            description: "Citizens and agents are mobile-first, while managers and admins stay web-first.",
            bullets: ["Citizen and agent web companion flows", "Primary manager/admin desktop surfaces", "Paris prototype scenario"],
          },
          {
            title: "Future-ready later",
            meta: "Not claimed as current scope",
            description: "Real hardware rollout, advanced AI, and broader platform externalization remain future-stage work.",
            bullets: ["Simulated measurements only", "No AI-first automation claim", "No production hardware claim"],
          },
        ],
      },
      {
        kind: "checklist",
        title: "Prototype commitments",
        items: [
          "Citizen reporting remains the primary operational trigger",
          "Manager and admin web remain the main desktop workspaces",
          "Citizen and agent web remain available without pretending they are the primary field channels",
          "Simulated measurement ingestion strengthens context without implying live deployed hardware",
        ],
      },
      {
        kind: "faq",
        title: "Scope FAQ",
        items: [
          {
            question: "Why does this page live at /pricing?",
            answer: "The route is kept for compatibility, but the content now clarifies prototype scope instead of pretending EcoTrack has a finalized commercial pricing model.",
          },
          {
            question: "Does EcoTrack require deployed container hardware today?",
            answer: "No. The current prototype uses citizen reports first and simulated measurements second.",
          },
          {
            question: "What remains future-ready only?",
            answer: "Real hardware rollout, advanced AI or ML, and broader event-platform externalization remain later-stage work rather than current product claims.",
          },
        ],
      },
    ],
  },
  support: {
    key: "support",
    path: "support",
    href: "/support",
    label: "Support",
    eyebrow: "Resources",
    title: "Support and demo guidance for the prototype",
    description:
      "EcoTrack support guidance is organized for development, demo, and validation use rather than production SLA claims.",
    quickFacts: ["Demo guidance", "Validation triage", "Named follow-up paths"],
    primaryCta: { label: "Contact support", href: "/contact" },
    secondaryCta: { label: "Security overview", href: "/security" },
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        kind: "matrix",
        title: "Prototype issue triage",
        columns: ["First response target", "Update cadence", "Resolution target"],
        rows: [
          { label: "Demo blocker", values: ["Same day", "As needed", "Before next walkthrough"] },
          { label: "Validation issue", values: ["Next business day", "Daily", "Planned in current dev cycle"] },
          { label: "Documentation gap", values: ["Next business day", "Daily", "Bundled with the next doc-sync update"] },
        ],
      },
      {
        kind: "cardGrid",
        columns: 3,
        title: "Support channels",
        items: [
          {
            title: "In-app support",
            description: "Best for workflow questions, configuration help, and general troubleshooting during demos or validation.",
            bullets: ["Attach relevant route, report, or dashboard context", "Include the affected area or service flow"],
          },
          {
            title: "Priority escalation",
            description: "Use for blocker issues that stop a demo, walkthrough, or validation run across reporting, planning, or field execution.",
            bullets: ["Include impact scope", "Name the current owner and fallback contact"],
          },
          {
            title: "Prototype advisory",
            description: "Use for scope questions, product-positioning feedback, and next-step planning after the current prototype phase.",
            bullets: ["Workflow optimization guidance", "Product framing and follow-up planning"],
          },
        ],
      },
      {
        kind: "checklist",
        title: "How to speed up issue resolution",
        items: [
          "Share exact behavior, timestamp, and service area affected",
          "List impacted users, containers, zones, or routes",
          "Describe expected behavior versus what actually happened",
          "Include any workaround or manual process currently in use",
        ],
      },
    ],
  },
  terms: {
    key: "terms",
    path: "terms",
    href: "/terms",
    label: "Terms",
    eyebrow: "Legal",
    title: "Terms of service overview",
    description:
      "This page summarizes service access terms, account responsibilities, and EcoTrack usage boundaries for customers.",
    quickFacts: ["Service access terms", "Acceptable use boundaries", "Contract-aligned obligations"],
    primaryCta: { label: "Contact legal team", href: "/contact" },
    secondaryCta: { label: "Read privacy notice", href: "/privacy" },
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        kind: "cardGrid",
        columns: 2,
        title: "Agreement highlights",
        items: [
          {
            title: "Account responsibility",
            description: "Customers manage their users and maintain authorized access behavior across EcoTrack workspaces.",
            bullets: ["Protect credentials", "Review role assignments periodically"],
          },
          {
            title: "Acceptable use",
            description: "Use must remain lawful and aligned with agreed service purposes.",
            bullets: ["No abusive traffic", "No unauthorized access attempts"],
          },
          {
            title: "Service continuity",
            description: "Maintenance and service updates follow communicated operational practice.",
            bullets: ["Planned maintenance windows", "Issue communication standards"],
          },
          {
            title: "Commercial terms",
            description: "Billing, renewals, and plan entitlements follow executed agreements.",
            bullets: ["Plan-based entitlements", "Contract-defined obligations"],
          },
        ],
      },
      {
        kind: "checklist",
        title: "Customer obligations",
        items: [
          "Ensure each user has an authorized operational purpose",
          "Maintain accurate administrative and billing contacts",
          "Report suspected misuse promptly",
          "Follow documented escalation paths for urgent issues",
        ],
      },
      {
        kind: "faq",
        title: "Terms FAQ",
        items: [
          {
            question: "Is this page a full legal agreement?",
            answer: "No. This is a plain-language overview. Binding terms are defined in your signed agreement.",
          },
          {
            question: "Can pilot or evaluation partners have custom terms?",
            answer: "Yes. Prototype collaborations can still include negotiated clauses and service expectations when needed.",
          },
        ],
      },
    ],
  },
  privacy: {
    key: "privacy",
    path: "privacy",
    href: "/privacy",
    label: "Privacy",
    eyebrow: "Legal",
    title: "Privacy overview for EcoTrack operational data",
    description:
      "EcoTrack processes account data, citizen reports, sensor telemetry, and workspace activity to operate the platform responsibly.",
    quickFacts: ["Purpose-limited processing", "Role-scoped access", "Documented request handling"],
    primaryCta: { label: "Cookie policy", href: "/cookies" },
    secondaryCta: { label: "Security controls", href: "/security" },
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        kind: "cardGrid",
        columns: 3,
        title: "Data categories processed",
        items: [
          {
            title: "Account and identity data",
            description: "User identity, role, and access metadata required for authentication, authorization, and account support.",
          },
          {
            title: "Citizen and operational report data",
            description: "Report details, location context, and workflow history used to manage collection and service issues.",
          },
          {
            title: "Sensor and platform telemetry",
            description: "Container measurements, reliability signals, and product telemetry used to operate and improve EcoTrack.",
          },
        ],
      },
      {
        kind: "timeline",
        title: "Privacy request workflow",
        items: [
          { title: "Request intake", detail: "Submit a privacy request with account scope and responsible contact details." },
          { title: "Verification", detail: "Identity and authority are verified before action is taken.", window: "1-2 business days" },
          { title: "Assessment", detail: "Relevant data scope and legal basis are reviewed with the necessary stakeholders." },
          { title: "Execution", detail: "Approved actions are processed and tracked to completion." },
          { title: "Confirmation", detail: "The requester receives status and closure confirmation." },
        ],
      },
      {
        kind: "checklist",
        title: "Privacy commitments",
        items: [
          "Use data only for agreed operational purposes",
          "Restrict access according to role and business need",
          "Maintain retention behavior aligned with obligations",
          "Support documented customer request workflows",
        ],
      },
    ],
  },
  cookies: {
    key: "cookies",
    path: "cookies",
    href: "/cookies",
    label: "Cookies",
    eyebrow: "Legal",
    title: "Cookie policy overview",
    description:
      "Cookies and similar technologies support secure sessions, product reliability, and aggregate performance analysis across the EcoTrack web experience.",
    quickFacts: ["Essential session cookies", "Preference settings", "Aggregate measurement data"],
    primaryCta: { label: "Read privacy notice", href: "/privacy" },
    secondaryCta: { label: "Back to landing", href: "/" },
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        kind: "matrix",
        title: "Cookie categories",
        columns: ["Purpose", "Examples", "Typical retention"],
        rows: [
          {
            label: "Essential",
            values: ["Authentication and session continuity", "Session token", "Session duration"],
          },
          {
            label: "Preference",
            values: ["Remember interface settings", "UI preference flags", "Up to 12 months"],
          },
          {
            label: "Measurement",
            values: ["Aggregate usage and reliability insights", "Page performance counters", "Up to 13 months"],
          },
        ],
      },
      {
        kind: "checklist",
        title: "Manage cookie settings",
        items: [
          "Use browser controls to clear existing cookies",
          "Adjust browser preferences for future cookie behavior",
          "Keep essential cookies enabled for sign-in and secure sessions",
          "Review settings after browser updates or policy changes",
        ],
      },
      {
        kind: "faq",
        title: "Cookie FAQ",
        items: [
          {
            question: "Can I disable all cookies?",
            answer: "You can, but disabling essential cookies will affect sign-in and core workspace behavior.",
          },
          {
            question: "Are cookies used to sell personal data?",
            answer: "No. Cookie usage is focused on secure sessions, product reliability, and aggregate performance measurement.",
          },
        ],
      },
    ],
  },
};

export const MARKETING_PAGE_LIST = Object.values(MARKETING_PAGES);

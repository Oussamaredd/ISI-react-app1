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

export const MARKETING_PAGES: Record<MarketingPageKey, MarketingPageContent> = {
  about: {
    key: "about",
    path: "about",
    href: "/about",
    label: "About",
    eyebrow: "Company",
    title: "Built for service teams where minutes matter",
    description:
      "EcoTrack helps hospitality operations run a tighter incident loop from intake to verified resolution, without communication gaps between teams.",
    quickFacts: ["2019 launch", "40+ multi-site deployments", "24/7 operational workflows"],
    primaryCta: { label: "Book walkthrough", href: "/contact" },
    secondaryCta: { label: "View features", href: "/features" },
    lastUpdated: "February 12, 2026",
    sections: [
      {
        kind: "highlights",
        title: "Operational outcomes teams report",
        items: [
          { label: "Median first response", value: "12 min", note: "Across active managed deployments." },
          { label: "Escalation leakage", value: "-31%", note: "Fewer unresolved handoffs after rollout." },
          { label: "Manager review time", value: "-24%", note: "Faster daily review and follow-up." },
        ],
      },
      {
        kind: "cardGrid",
        columns: 3,
        title: "Where EcoTrack fits",
        description: "The platform was designed around real shift patterns, not idealized workflows.",
        items: [
          {
            title: "Front desk and concierge",
            description: "Capture guest-impacting issues in a single intake flow.",
            bullets: ["Priority tagging at creation", "Clear handoff to specialist teams"],
          },
          {
            title: "Operations managers",
            description: "Track queue health and remove blockers before SLA risk grows.",
            bullets: ["Live workload visibility", "Cross-site comparison snapshots"],
          },
          {
            title: "Admin and governance",
            description: "Enforce role-safe access and audit-ready process coverage.",
            bullets: ["Role controls by function", "Structured action history"],
          },
        ],
      },
      {
        kind: "timeline",
        title: "Typical customer rollout",
        items: [
          { title: "Week 1: Discovery", detail: "Map queue types, ownership model, and escalation policy.", owner: "Customer lead + onboarding specialist" },
          { title: "Week 2: Configuration", detail: "Set role permissions, routing defaults, and operational views.", owner: "Platform admin", window: "3-5 business days" },
          { title: "Week 3: Pilot", detail: "Run a controlled production pilot with selected teams and shifts.", owner: "Site operations manager" },
          { title: "Week 4: Scale", detail: "Expand to remaining teams with dashboard and support playbooks active.", owner: "Program owner" },
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
    title: "Reach the team that can unblock you quickly",
    description:
      "Choose the channel that matches your request type and urgency. We route every request to a named owner.",
    quickFacts: ["Implementation desk", "Customer success coverage", "Priority incident channel"],
    primaryCta: { label: "Support playbook", href: "/support" },
    secondaryCta: { label: "Back to landing", href: "/" },
    lastUpdated: "February 12, 2026",
    sections: [
      {
        kind: "cardGrid",
        columns: 3,
        title: "Contact channels",
        items: [
          {
            title: "Sales and onboarding",
            description: "For evaluations, migration planning, and rollout design.",
            bullets: ["Discovery sessions", "Environment planning", "Procurement support"],
            meta: "Business hours",
          },
          {
            title: "Customer support",
            description: "For daily product use, troubleshooting, and workflow questions.",
            bullets: ["Ticket triage help", "Configuration guidance", "Escalation checks"],
            meta: "24/7 intake",
          },
          {
            title: "Security and compliance",
            description: "For vendor reviews, security questionnaires, and policy requests.",
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
          { label: "General inquiry", values: ["Mon-Fri", "1 business day", "New business and account planning"] },
          { label: "Support request", values: ["24/7 intake", "< 4 hours", "Product usage and issue investigation"] },
          { label: "Critical incident", values: ["24/7 priority", "< 30 minutes", "Production-impacting outages"] },
        ],
      },
      {
        kind: "checklist",
        title: "Send this context with your request",
        description: "Providing this upfront cuts repeated clarification cycles.",
        items: [
          "Affected property, team, or workflow",
          "Business impact and current workaround",
          "Request timestamp and timezone",
          "Expected outcome and urgency level",
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
    title: "Security by default in product and operations",
    description:
      "EcoTrack security practices combine role-aware access, controlled changes, and structured incident handling across environments.",
    quickFacts: ["Role-based access", "Controlled release process", "Formal incident workflow"],
    primaryCta: { label: "Contact security", href: "/contact" },
    secondaryCta: { label: "Read privacy", href: "/privacy" },
    lastUpdated: "February 12, 2026",
    sections: [
      {
        kind: "cardGrid",
        columns: 2,
        title: "Security control areas",
        items: [
          {
            title: "Identity and access",
            description: "Authentication with explicit role assignment and privilege boundaries.",
            bullets: ["Role-aware authorization", "Admin access controls", "Session management policies"],
          },
          {
            title: "Application controls",
            description: "Layered controls in routing, service logic, and environment configuration.",
            bullets: ["Guarded privileged routes", "Input validation", "Environment policy checks"],
          },
          {
            title: "Operational safeguards",
            description: "Controlled deployment flow and issue triage runbooks.",
            bullets: ["Release review checkpoints", "Rollback procedures", "Post-incident reviews"],
          },
          {
            title: "Data handling",
            description: "Purpose-limited processing with governance support.",
            bullets: ["Access scoping", "Retention alignment", "Audit-friendly change tracking"],
          },
        ],
      },
      {
        kind: "timeline",
        title: "Incident handling lifecycle",
        items: [
          { title: "Detect", detail: "Signals from monitoring, support reports, or internal checks are triaged.", window: "Immediate" },
          { title: "Contain", detail: "A responsible owner is assigned and containment actions are executed.", window: "< 60 minutes" },
          { title: "Communicate", detail: "Stakeholders receive scoped updates based on impact and severity.", owner: "Incident commander" },
          { title: "Recover", detail: "Service integrity is restored and monitored through stabilization.", window: "Severity dependent" },
          { title: "Review", detail: "Root cause and corrective actions are documented with accountable follow-through.", window: "Within 5 business days" },
        ],
      },
      {
        kind: "faq",
        title: "Security FAQ",
        items: [
          {
            question: "How are privileged actions controlled?",
            answer: "Administrative actions are gated by role-based permissions and environment-specific safeguards.",
          },
          {
            question: "Do you support security questionnaires?",
            answer: "Yes. Submit questionnaire requests through the contact page and include procurement timelines.",
          },
          {
            question: "How do you handle incident communication?",
            answer: "Incidents follow severity-driven communication, with updates provided as impact and mitigation status evolves.",
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
    title: "Features designed for daily operational load",
    description:
      "Everything in EcoTrack supports faster triage, clearer ownership, and reliable closure across distributed teams.",
    quickFacts: ["Deterministic routing", "Advanced queue controls", "Audit-ready activity timeline"],
    primaryCta: { label: "See pricing", href: "/pricing" },
    secondaryCta: { label: "How it works", href: "/how-it-works" },
    lastUpdated: "February 12, 2026",
    sections: [
      {
        kind: "cardGrid",
        columns: 3,
        title: "Core feature areas",
        items: [
          {
            title: "Ticket intake and triage",
            description: "Capture issues with consistent metadata to reduce noisy back-and-forth.",
            bullets: ["Priority fields", "Category structure", "Assignment-ready payloads"],
          },
          {
            title: "Assignment and treatment",
            description: "Route to the right owner and track work progress through explicit states.",
            bullets: ["Owner accountability", "Treatment actions", "Status progression"],
          },
          {
            title: "Advanced list controls",
            description: "Use filtering and sorting to isolate risk quickly during busy shifts.",
            bullets: ["Multi-filter search", "Priority views", "Status-specific slices"],
          },
          {
            title: "Admin governance",
            description: "Configure user access, controls, and operational settings centrally.",
            bullets: ["Role management", "Settings controls", "Policy alignment"],
          },
          {
            title: "Dashboard visibility",
            description: "Track backlog and response metrics to prevent slowdowns.",
            bullets: ["Queue snapshots", "Trend visibility", "Cross-team status"],
          },
          {
            title: "Legacy route continuity",
            description: "Preserve existing bookmarks while transitioning to structured app routing.",
            bullets: ["Compatibility redirects", "Migration notices", "Safer rollout path"],
          },
        ],
      },
      {
        kind: "highlights",
        title: "Common improvements after adoption",
        items: [
          { label: "Handoff delays", value: "-27%", note: "Improved routing and ownership transparency." },
          { label: "Stale tickets", value: "-35%", note: "Faster identification through queue controls." },
          { label: "Manual status checks", value: "-22%", note: "Managers use dashboard snapshots instead." },
        ],
      },
      {
        kind: "matrix",
        title: "Workflow coverage by role",
        columns: ["Front desk", "Ops manager", "Administrator"],
        rows: [
          { label: "Create and triage", values: ["Primary", "Review", "Policy"] },
          { label: "Assign and treat", values: ["Contribute", "Primary", "Policy"] },
          { label: "Monitor performance", values: ["View", "Primary", "Governance"] },
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
    title: "A practical ticket lifecycle teams can execute daily",
    description:
      "EcoTrack uses a repeatable lifecycle so incidents move cleanly from intake through closure, even during peak load.",
    quickFacts: ["Structured lifecycle", "Role-specific ownership", "SLA visibility at each step"],
    primaryCta: { label: "Start with pricing", href: "/pricing" },
    secondaryCta: { label: "View support model", href: "/support" },
    lastUpdated: "February 12, 2026",
    sections: [
      {
        kind: "timeline",
        title: "Ticket lifecycle",
        description: "Each phase has an accountable owner and clear expected output.",
        items: [
          { title: "1. Intake", detail: "Issue is logged with required operational context.", owner: "Initiator" },
          { title: "2. Triage", detail: "Priority and category are validated for routing.", owner: "Duty lead" },
          { title: "3. Assignment", detail: "Ticket is assigned to a responsible responder.", owner: "Ops coordinator" },
          { title: "4. Treatment", detail: "Actions are executed and documented in timeline.", owner: "Responder" },
          { title: "5. Verification", detail: "Resolution is validated before closure.", owner: "Reviewer" },
          { title: "6. Close and learn", detail: "Ticket closes with notes for future prevention.", owner: "Ops manager" },
        ],
      },
      {
        kind: "matrix",
        title: "Service level states",
        columns: ["When it applies", "Expected action", "Escalation trigger"],
        rows: [
          { label: "New", values: ["Fresh intake", "Triage within queue target", "No owner after target window"] },
          { label: "In progress", values: ["Owner assigned", "Work updates logged", "No update within SLA interval"] },
          { label: "Blocked", values: ["Dependency unresolved", "Escalate blocker owner", "Block persists past review window"] },
          { label: "Resolved", values: ["Fix delivered", "Request verification", "Verification fails or reopens"] },
        ],
      },
      {
        kind: "checklist",
        title: "First 30-day implementation plan",
        items: [
          "Define priority and escalation policy by queue type",
          "Configure role permissions and assignment defaults",
          "Pilot with one property and one high-volume queue",
          "Review KPI deltas and tune routing thresholds",
        ],
        footnote: "Most teams complete baseline rollout in under four weeks.",
      },
    ],
  },
  pricing: {
    key: "pricing",
    path: "pricing",
    href: "/pricing",
    label: "Pricing",
    eyebrow: "Commercial",
    title: "Pricing built for growing operational complexity",
    description:
      "Choose a plan that matches your team size, governance needs, and response expectations. Upgrade paths are straightforward.",
    quickFacts: ["Monthly or annual billing", "Tiered support coverage", "No forced migration"],
    primaryCta: { label: "Contact sales", href: "/contact" },
    secondaryCta: { label: "Read support policy", href: "/support" },
    lastUpdated: "February 12, 2026",
    sections: [
      {
        kind: "cardGrid",
        columns: 3,
        title: "Plan overview",
        items: [
          {
            title: "Starter",
            meta: "$19 / seat / month",
            description: "For smaller teams standardizing ticket intake and assignment.",
            bullets: ["Unlimited tickets", "Core workflow controls", "Email support"],
          },
          {
            title: "Scale",
            meta: "$49 / seat / month",
            description: "For multi-site operations with stricter response targets.",
            bullets: ["Advanced filtering", "Role governance controls", "Priority support"],
          },
          {
            title: "Enterprise",
            meta: "$99 / seat / month",
            description: "For organizations with formal governance and onboarding requirements.",
            bullets: ["Dedicated onboarding", "Custom analytics", "SLA governance support"],
          },
        ],
      },
      {
        kind: "checklist",
        title: "Included in every plan",
        items: [
          "Ticket lifecycle and assignment workflows",
          "Authenticated access and role-aware navigation",
          "Core dashboard visibility and reporting support",
          "Product updates and release improvements",
        ],
      },
      {
        kind: "faq",
        title: "Commercial FAQ",
        items: [
          {
            question: "Can we start on Starter and move later?",
            answer: "Yes. Teams commonly begin with Starter then move to Scale as workflow and governance needs expand.",
          },
          {
            question: "Do annual plans include discounts?",
            answer: "Yes. Annual billing is available for all plans and typically provides a lower effective monthly rate.",
          },
          {
            question: "Can Enterprise include custom onboarding scope?",
            answer: "Yes. Enterprise onboarding scope is defined during planning and procurement.",
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
    title: "Support operations playbook",
    description:
      "Support is organized by severity and business impact so teams get predictable response behavior when issues matter most.",
    quickFacts: ["24/7 intake", "Severity-based triage", "Structured escalation"],
    primaryCta: { label: "Contact support", href: "/contact" },
    secondaryCta: { label: "Read security process", href: "/security" },
    lastUpdated: "February 12, 2026",
    sections: [
      {
        kind: "matrix",
        title: "Severity and response targets",
        columns: ["First response target", "Update cadence", "Resolution target"],
        rows: [
          { label: "P1 Critical", values: ["< 30 minutes", "Every 60 minutes", "Continuous effort until mitigation"] },
          { label: "P2 High", values: ["< 2 hours", "Every 4 hours", "Next business day target"] },
          { label: "P3 Standard", values: ["< 1 business day", "Daily", "Planned in normal cycle"] },
        ],
      },
      {
        kind: "cardGrid",
        columns: 3,
        title: "Support channels",
        items: [
          {
            title: "In-app support",
            description: "Best for product workflow issues and general troubleshooting.",
            bullets: ["Attach relevant ticket IDs", "Include affected queue details"],
          },
          {
            title: "Priority escalation",
            description: "Use for production-impacting service interruptions.",
            bullets: ["Include impact scope", "Name incident owner and fallback contact"],
          },
          {
            title: "Success advisory",
            description: "Use for process tuning, adoption planning, and KPI reviews.",
            bullets: ["Monthly workflow reviews", "Process improvement guidance"],
          },
        ],
      },
      {
        kind: "checklist",
        title: "How to speed up issue resolution",
        items: [
          "Share exact error behavior and timestamp",
          "List impacted users, properties, or queues",
          "Provide expected behavior vs actual behavior",
          "Include any temporary workaround already applied",
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
      "This page summarizes operational terms, account responsibilities, and platform usage boundaries for customers.",
    quickFacts: ["Service access terms", "Acceptable use boundaries", "Contract-aligned obligations"],
    primaryCta: { label: "Contact legal team", href: "/contact" },
    secondaryCta: { label: "Read privacy notice", href: "/privacy" },
    lastUpdated: "February 12, 2026",
    sections: [
      {
        kind: "cardGrid",
        columns: 2,
        title: "Agreement highlights",
        items: [
          {
            title: "Account responsibility",
            description: "Customers manage account users and maintain authorized access behavior.",
            bullets: ["Protect credentials", "Review role assignments periodically"],
          },
          {
            title: "Acceptable use",
            description: "Use must remain lawful and aligned with agreed service purposes.",
            bullets: ["No abusive traffic", "No unauthorized access attempts"],
          },
          {
            title: "Service continuity",
            description: "Service updates and maintenance follow communicated operational practice.",
            bullets: ["Planned maintenance windows", "Issue communication standards"],
          },
          {
            title: "Commercial terms",
            description: "Billing, renewals, and service scope follow executed agreement terms.",
            bullets: ["Plan-based entitlements", "Contract-defined obligations"],
          },
        ],
      },
      {
        kind: "checklist",
        title: "Customer obligations",
        items: [
          "Ensure users have authorized business purpose",
          "Maintain accurate admin contact information",
          "Report suspected misuse promptly",
          "Follow incident escalation policy for urgent issues",
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
            question: "Can terms differ for Enterprise customers?",
            answer: "Yes. Enterprise contracts can include negotiated clauses and service requirements.",
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
    title: "Privacy notice overview",
    description:
      "EcoTrack processes operational data to run and improve service workflows while maintaining access and purpose controls.",
    quickFacts: ["Purpose-limited processing", "Role-scoped access", "Documented request workflow"],
    primaryCta: { label: "Cookie policy", href: "/cookies" },
    secondaryCta: { label: "Security controls", href: "/security" },
    lastUpdated: "February 12, 2026",
    sections: [
      {
        kind: "cardGrid",
        columns: 3,
        title: "Data categories processed",
        items: [
          {
            title: "Account and identity data",
            description: "User identity, role, and access metadata for authentication and authorization.",
          },
          {
            title: "Operational ticket data",
            description: "Ticket details, assignment state, and service timeline needed for incident management.",
          },
          {
            title: "System and usage telemetry",
            description: "Performance and reliability signals used to maintain platform quality.",
          },
        ],
      },
      {
        kind: "timeline",
        title: "Privacy request workflow",
        items: [
          { title: "Request intake", detail: "Submit request with account scope and responsible contact." },
          { title: "Verification", detail: "Identity and authority are verified before action.", window: "1-2 business days" },
          { title: "Assessment", detail: "Relevant data scope and legal basis are reviewed." },
          { title: "Execution", detail: "Approved request is processed and tracked to completion." },
          { title: "Confirmation", detail: "Requester receives status and closure summary." },
        ],
      },
      {
        kind: "checklist",
        title: "Privacy commitments",
        items: [
          "Use data only for agreed operational purposes",
          "Restrict internal access to least privilege",
          "Maintain retention behavior aligned to obligations",
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
      "Cookies and similar technologies support secure sessions, product reliability, and aggregate performance analysis.",
    quickFacts: ["Essential session cookies", "Preference settings", "Aggregate measurement data"],
    primaryCta: { label: "Read privacy notice", href: "/privacy" },
    secondaryCta: { label: "Back to landing", href: "/" },
    lastUpdated: "February 12, 2026",
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
            values: ["Remember user settings", "UI preference flags", "Up to 12 months"],
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
          "Keep essential cookies enabled for sign-in and session reliability",
          "Review settings after browser updates or policy changes",
        ],
      },
      {
        kind: "faq",
        title: "Cookie FAQ",
        items: [
          {
            question: "Can I disable all cookies?",
            answer: "You can, but disabling essential cookies will affect login and core product functionality.",
          },
          {
            question: "Are cookies used to sell personal data?",
            answer: "No. Cookie usage is focused on product operation, reliability, and aggregate performance measurement.",
          },
        ],
      },
    ],
  },
};

export const MARKETING_PAGE_LIST = Object.values(MARKETING_PAGES);

import {
  BellRing,
  Building2,
  ChartSpline,
  Clock4,
  Route,
  ShieldCheck,
} from "lucide-react";

const cards = [
  {
    title: "Live dispatch board",
    copy: "Route tickets to the right hotel, team, or specialist with one deterministic workflow.",
    icon: Route,
    featured: true,
  },
  {
    title: "Audit-ready timeline",
    copy: "Capture every comment, assignment, and state change in a single immutable activity stream.",
    icon: Clock4,
  },
  {
    title: "Role-safe access",
    copy: "Apply admin-level controls only where needed while keeping daily work frictionless.",
    icon: ShieldCheck,
  },
  {
    title: "Portfolio visibility",
    copy: "Track load across hotels and rebalance before bottlenecks impact guest experience.",
    icon: Building2,
  },
  {
    title: "Signal-driven alerts",
    copy: "Escalate stale or high-priority tickets quickly with clear owner accountability.",
    icon: BellRing,
  },
  {
    title: "Performance analytics",
    copy: "Understand first response and completion trends by site, assignee, and queue.",
    icon: ChartSpline,
  },
];

export default function FeaturesBentoSection() {
  return (
    <section id="features" className="landing-section">
      <div className="landing-container py-20">
        <div className="landing-reveal mx-auto max-w-3xl text-center">
          <h2 className="landing-h2">Built for operational clarity, not just ticket storage.</h2>
          <p className="mt-4 text-[var(--text-muted)]">
            Every card below represents a real workflow shortcut teams use during busy shifts.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className={`landing-reveal landing-glass-card p-6 ${
                  card.featured ? "md:col-span-2 md:row-span-2" : ""
                }`}
                style={{ animationDelay: `${Math.min(index * 80, 320)}ms` }}
              >
                <div className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border)] bg-white/10 p-2">
                  <Icon className="h-5 w-5 text-[var(--accent-soft)]" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{card.copy}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

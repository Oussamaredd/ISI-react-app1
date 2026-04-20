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
    title: "Citizen reporting is the operational trigger",
    copy: "Turn citizen reports into structured signals that managers can prioritize before overflow and missed collection issues spread.",
    icon: Route,
    featured: true,
  },
  {
    title: "Mobile-first citizen reporting",
    copy: "Keep geolocation, camera, and field-friendly reporting in the main citizen story while preserving web as a companion flow.",
    icon: Clock4,
  },
  {
    title: "Simulated measurement support",
    copy: "Use seeded and simulated measurement ingestion to enrich context without overclaiming a live deployed sensor fleet.",
    icon: ShieldCheck,
  },
  {
    title: "Manager web coordination",
    copy: "Give managers the primary desktop workspace for monitoring, planning, and reporting across the Paris prototype scenario.",
    icon: Building2,
  },
  {
    title: "Agent execution and validation",
    copy: "Guide agents through tours, stop validation, and anomaly reporting while keeping the mobile field workflow as the main story.",
    icon: BellRing,
  },
  {
    title: "Citizen follow-up and impact",
    copy: "Show citizens what was received, what is resolved, and what prototype impact is visible today without inventing hidden workflow states.",
    icon: ChartSpline,
  },
];

export default function FeaturesBentoSection() {
  return (
    <section id="features" className="landing-section">
      <div className="landing-container py-20">
        <div className="landing-reveal mx-auto max-w-3xl text-center">
          <h2 className="landing-h2">A clearer product split for one coherent prototype.</h2>
          <p className="mt-4 text-[var(--text-muted)]">
            EcoTrack centers citizen-driven reporting, then layers manager coordination, agent execution, and simulated measurement support around that core loop.
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

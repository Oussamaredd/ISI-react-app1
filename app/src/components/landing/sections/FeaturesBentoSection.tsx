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
    title: "Route planning and tour orchestration",
    copy: "Build collection tours from zone risk, fill-level signals, and service priorities before overflow spreads.",
    icon: Route,
    featured: true,
  },
  {
    title: "Citizen reporting intake",
    copy: "Turn overflow, missed collection, and damaged container reports into structured operational work.",
    icon: Clock4,
  },
  {
    title: "Live container monitoring",
    copy: "Stream fill levels, battery health, and anomaly signals from connected containers into one live view.",
    icon: ShieldCheck,
  },
  {
    title: "Zone risk heatmaps",
    copy: "See hotspots across zones and containers so managers can prioritize response before service quality drops.",
    icon: Building2,
  },
  {
    title: "Crew execution",
    copy: "Guide field teams through assigned stops, collection validation, and completion updates during active rounds.",
    icon: BellRing,
  },
  {
    title: "Performance analytics",
    copy: "Track service reliability, collection throughput, and operational trends across sites and service areas.",
    icon: ChartSpline,
  },
];

export default function FeaturesBentoSection() {
  return (
    <section id="features" className="landing-section">
      <div className="landing-container py-20">
        <div className="landing-reveal mx-auto max-w-3xl text-center">
          <h2 className="landing-h2">Everything your waste operations team needs in one platform.</h2>
          <p className="mt-4 text-[var(--text-muted)]">
            EcoTrack replaces fragmented spreadsheets, inboxes, and disconnected tools with one shared operating system.
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

import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../ui/button";

const plans = [
  {
    name: "Implemented now",
    description: "The current prototype already supports citizen reports, manager planning, agent tours, admin controls, auth, and realtime updates.",
    features: ["Citizen reporting", "Manager planning and dashboard", "Agent tour validation"],
    ctaLabel: "Open EcoTrack",
    ctaHref: "/login",
  },
  {
    name: "Role split",
    description: "Citizens and agents stay mobile-first, while managers and admins use the primary web workspaces for coordination and oversight.",
    features: ["Citizen and agent web companion flows", "Manager and admin web-first flows", "Paris scenario framing"],
    ctaLabel: "See the flow",
    ctaHref: "/login",
    highlighted: true,
  },
  {
    name: "Future-ready later",
    description: "Simulated measurements exist today, but real hardware rollout, advanced AI, and broader platform externalization remain later-stage extensions.",
    features: ["Simulated measurement ingestion", "Future hardware adapter seam", "Future analytics expansion"],
    ctaLabel: "Read scope",
    ctaHref: "/pricing",
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="landing-section">
      <div className="landing-container py-20">
        <div className="landing-reveal mx-auto max-w-3xl text-center">
          <h2 className="landing-h2">Prototype scope and boundaries.</h2>
          <p className="mt-4 text-[var(--text-muted)]">
            EcoTrack is currently framed as a school prototype, not a commercial pricing sheet. This section clarifies what exists now, how roles are split, and what remains future-ready only.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {plans.map((plan, index) => (
            <article
              key={plan.name}
              className={`landing-reveal landing-glass-card p-6 ${
                plan.highlighted ? "ring-1 ring-[var(--accent-soft)]" : ""
              }`}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{plan.description}</p>
              <ul className="mt-5 space-y-2 text-sm text-[var(--text-muted)]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--accent-soft)]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to={plan.ctaHref} className="mt-6 block">
                <Button className="w-full" variant={plan.highlighted ? "default" : "secondary"}>
                  {plan.ctaLabel}
                </Button>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

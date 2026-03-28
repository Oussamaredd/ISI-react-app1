import React from "react";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";

const plans = [
  {
    name: "Starter",
    monthly: 29,
    annual: 24,
    description: "For pilot deployments and smaller service areas digitizing daily waste operations.",
    features: ["Citizen reporting intake", "Route planning basics", "Email support"],
    ctaLabel: "Start Pilot",
    ctaHref: "/login",
  },
  {
    name: "Scale",
    monthly: 79,
    annual: 64,
    description: "For multi-zone operations using live container data and field coordination.",
    features: ["Live container monitoring", "Zone risk heatmaps", "Priority support"],
    ctaLabel: "Scale Operations",
    ctaHref: "/login",
    highlighted: true,
  },
  {
    name: "Enterprise",
    monthly: 149,
    annual: 129,
    description: "For municipalities and operators with advanced governance, integrations, and analytics needs.",
    features: ["Dedicated onboarding", "Custom analytics", "Governance controls"],
    ctaLabel: "Talk to Sales",
    ctaHref: "/contact",
  },
];

export default function PricingSection() {
  const [yearly, setYearly] = React.useState(true);

  return (
    <section id="pricing" className="landing-section">
      <div className="landing-container py-20">
        <div className="landing-reveal mx-auto max-w-3xl text-center">
          <h2 className="landing-h2">Plans for pilots, multi-zone rollouts, and city-scale operations.</h2>
          <p className="mt-4 text-[var(--text-muted)]">
            Choose the EcoTrack package that matches your service footprint, field complexity, and reporting needs.
          </p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-[var(--radius-pill)] border border-[var(--border)] bg-white/5 px-4 py-2 text-sm">
            <span className={!yearly ? "text-[var(--text)]" : "text-[var(--text-muted)]"}>Monthly</span>
            <Switch checked={yearly} onCheckedChange={setYearly} aria-label="Toggle annual pricing" />
            <span className={yearly ? "text-[var(--text)]" : "text-[var(--text-muted)]"}>
              Annual
            </span>
            <span className="rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-[var(--text)]">
              Save 20%
            </span>
          </div>
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
              <p className="mt-5 text-4xl font-semibold text-[var(--text)]">
                ${yearly ? plan.annual : plan.monthly}
                <span className="text-sm font-medium text-[var(--text-muted)]">/ops seat</span>
              </p>
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

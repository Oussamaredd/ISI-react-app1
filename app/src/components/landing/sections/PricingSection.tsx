import React from "react";
import { Check } from "lucide-react";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";

const plans = [
  {
    name: "Starter",
    monthly: 19,
    annual: 15,
    description: "For small support teams standardizing daily workflows.",
    features: ["Unlimited tickets", "Basic assignment rules", "Email support"],
  },
  {
    name: "Scale",
    monthly: 49,
    annual: 39,
    description: "For growing operations with multiple hotels and stricter SLAs.",
    features: ["Advanced filters", "Role controls", "Priority support"],
    highlighted: true,
  },
  {
    name: "Enterprise",
    monthly: 99,
    annual: 85,
    description: "For large organizations with custom governance and integrations.",
    features: ["Dedicated onboarding", "Custom analytics", "SLA governance"],
  },
];

export default function PricingSection() {
  const [yearly, setYearly] = React.useState(true);

  return (
    <section id="pricing" className="landing-section">
      <div className="landing-container py-20">
        <div className="landing-reveal mx-auto max-w-3xl text-center">
          <h2 className="landing-h2">Pricing that scales with your operations maturity.</h2>
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
                <span className="text-sm font-medium text-[var(--text-muted)]">/seat</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-[var(--text-muted)]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[var(--accent-soft)]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full" variant={plan.highlighted ? "default" : "secondary"}>
                {plan.highlighted ? "Start Scale Plan" : "Get Started"}
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

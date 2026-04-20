const steps = [
  {
    title: "Citizen reports",
    copy: "A citizen spots a container problem and sends a structured report into the EcoTrack queue.",
  },
  {
    title: "Manager prioritizes",
    copy: "Managers review the citizen signal first, then use simulated measurement context and planning tools to decide the next action.",
  },
  {
    title: "Agent validates",
    copy: "Agents execute the assigned tour, validate collection, and record what happened in the field.",
  },
  {
    title: "Citizen sees follow-up",
    copy: "EcoTrack exposes the available report status, resolved counts, and current prototype impact without pretending hidden workflow steps are visible yet.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="landing-section">
      <div className="landing-container py-20">
        <div className="landing-reveal mx-auto max-w-3xl text-center">
          <h2 className="landing-h2">From citizen signal to validated collection follow-up.</h2>
          <p className="mt-4 text-[var(--text-muted)]">
            This is the product loop EcoTrack is designed to defend in the current prototype.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="landing-reveal landing-glass-card relative p-6"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white/10 text-sm font-semibold text-[var(--accent-soft)]">
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{step.copy}</p>
              {index < steps.length - 1 && (
                <span
                  className="absolute right-[-20px] top-1/2 hidden h-px w-10 bg-[var(--border)] md:block"
                  aria-hidden="true"
                />
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

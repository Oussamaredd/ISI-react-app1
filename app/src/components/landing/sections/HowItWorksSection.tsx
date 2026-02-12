const steps = [
  {
    title: "Capture",
    copy: "Create or ingest tickets with consistent metadata and clean triage signals.",
  },
  {
    title: "Route",
    copy: "Assign ownership by priority and location while keeping SLA targets visible.",
  },
  {
    title: "Resolve",
    copy: "Close with verified completion and full audit history for postmortem analysis.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="landing-section">
      <div className="landing-container py-20">
        <div className="landing-reveal mx-auto max-w-3xl text-center">
          <h2 className="landing-h2">From intake to resolution in three reliable steps.</h2>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
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

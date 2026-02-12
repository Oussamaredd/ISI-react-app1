import React from "react";
import { cn } from "../../../lib/utils";

const logos = [
  "Atlas Hospitality",
  "Northbound Suites",
  "Compass Ops",
  "Beacon Desk",
  "Harbor Group",
  "Fjord Hotels",
];

const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reducedMotion;
};

export default function LogoMarqueeSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="logos" className="landing-section">
      <div className="landing-container py-8">
        <p className="landing-reveal text-center text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Connected with teams that run round-the-clock support
        </p>
        <div className="landing-reveal mt-6 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-white/5 py-4">
          <div
            className={cn(
              "flex gap-8 px-6 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]",
              !reducedMotion && "landing-marquee-track",
            )}
          >
            {[...logos, ...logos].map((logo, index) => (
              <span key={`${logo}-${index}`} className="whitespace-nowrap">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

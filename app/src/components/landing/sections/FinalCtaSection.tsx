import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../ui/button";

export default function FinalCtaSection() {
  return (
    <section id="final-cta" className="landing-section">
      <div className="landing-container py-20">
        <div className="landing-reveal rounded-[var(--radius-lg)] border border-[var(--border)] bg-[linear-gradient(145deg,rgba(79,140,255,0.34),rgba(10,18,36,0.9))] p-8 text-center shadow-[0_16px_52px_rgba(23,62,155,0.42)] sm:p-12">
          <h2 className="landing-h2">Bring route planning, citizen reporting, and container intelligence into one workspace.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
            EcoTrack helps operations teams move from detection to collection without losing context between the office, the field, and the public.
          </p>
          <div className="mt-8">
            <Link to="/login">
              <Button size="lg">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

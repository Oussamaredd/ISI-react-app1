import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../ui/button";

export default function FinalCtaSection() {
  return (
    <section id="final-cta" className="landing-section">
      <div className="landing-container py-20">
        <div className="landing-reveal rounded-[var(--radius-lg)] border border-[var(--border)] bg-[linear-gradient(145deg,rgba(79,140,255,0.34),rgba(10,18,36,0.9))] p-8 text-center shadow-[0_16px_52px_rgba(23,62,155,0.42)] sm:p-12">
          <h2 className="landing-h2">Bring order to your operational queue this sprint.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
            Start with your existing auth flow and roll into the `/app/*` namespace without backend
            contract changes.
          </p>
          <div className="mt-8">
            <Link to="/auth">
              <Button size="lg">
                Start now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

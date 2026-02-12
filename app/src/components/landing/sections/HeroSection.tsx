import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useLandingSectionNavigation } from "../../../hooks/useLandingSectionScroll";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";

export default function HeroSection() {
  const navigateToSection = useLandingSectionNavigation();

  return (
    <section id="hero" className="landing-section">
      <div className="landing-container py-20 sm:py-24">
        <div className="landing-reveal mx-auto max-w-4xl text-center">
          <Badge className="mb-6">
            <ShieldCheck className="mr-2 h-3.5 w-3.5 text-[var(--accent-soft)]" />
            Trusted by support teams with strict SLA targets
          </Badge>
          <h1 className="landing-h1">
            Bridge every ticket handoff with{" "}
            <span className="landing-gradient-text">one control surface.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
            EcoTrack helps operations teams move from intake to assignment to resolution without
            context loss, queue sprawl, or fragile spreadsheets.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigateToSection("pricing")}
            >
              View Pricing
            </Button>
          </div>
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            Used by support, concierge, and escalation teams across hotel operations.
          </p>
        </div>
      </div>
    </section>
  );
}

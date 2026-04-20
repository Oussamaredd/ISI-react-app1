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
            Citizen-first coordination prototype
          </Badge>
          <h1 className="landing-h1">
            Citizen reports drive{" "}
            <span className="landing-gradient-text">faster collection follow-through.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
            EcoTrack is a software-only school prototype set in Paris: citizens report container
            problems, managers prioritize the signal, agents validate collection, and the platform
            keeps the operational loop visible without pretending a live hardware rollout already exists.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login">
              <Button size="lg">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigateToSection("how-it-works")}
            >
              See How It Works
            </Button>
          </div>
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            Mobile-first for citizens and agents. Web-first for managers and admins. Simulated
            measurements support the workflow, but citizen reports remain the main signal in the current prototype.
          </p>
        </div>
      </div>
    </section>
  );
}

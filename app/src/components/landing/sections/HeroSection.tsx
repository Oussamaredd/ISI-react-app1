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
            Smart waste operations platform
          </Badge>
          <h1 className="landing-h1">
            Faster waste collection with{" "}
            <span className="landing-gradient-text">one control center.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--text-muted)] sm:text-lg">
            Plan collection routes, monitor connected containers, turn citizen reports into action,
            and keep crews plus managers aligned from one shared workspace.
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
            Built for municipalities, private operators, campuses, and service teams managing daily collections.
          </p>
        </div>
      </div>
    </section>
  );
}

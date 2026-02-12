import Navbar from "../../components/landing/Navbar";
import GradientGlow from "../../components/landing/background/GradientGlow";
import GridOverlay from "../../components/landing/background/GridOverlay";
import Vignette from "../../components/landing/background/Vignette";
import HeroSection from "../../components/landing/sections/HeroSection";
import LogoMarqueeSection from "../../components/landing/sections/LogoMarqueeSection";
import FeaturesBentoSection from "../../components/landing/sections/FeaturesBentoSection";
import HowItWorksSection from "../../components/landing/sections/HowItWorksSection";
import PricingSection from "../../components/landing/sections/PricingSection";
import FaqSection from "../../components/landing/sections/FaqSection";
import FinalCtaSection from "../../components/landing/sections/FinalCtaSection";
import FooterSection from "../../components/landing/sections/FooterSection";
import { useLandingSectionScroll } from "../../hooks/useLandingSectionScroll";

export default function LandingPage() {
  useLandingSectionScroll();

  return (
    <div className="landing-root">
      <GradientGlow />
      <GridOverlay />
      <Vignette />

      <div className="landing-content">
        <Navbar />

        <main>
          <HeroSection />
          <LogoMarqueeSection />
          <FeaturesBentoSection />
          <HowItWorksSection />
          <PricingSection />
          <FaqSection />
          <FinalCtaSection />
        </main>

        <FooterSection />
      </div>
    </div>
  );
}

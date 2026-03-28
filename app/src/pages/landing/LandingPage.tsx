import { Suspense, lazy } from "react";
import DocumentMetadata from "../../components/DocumentMetadata";
import Navbar from "../../components/landing/Navbar";
import GradientGlow from "../../components/landing/background/GradientGlow";
import GridOverlay from "../../components/landing/background/GridOverlay";
import Vignette from "../../components/landing/background/Vignette";
import HeroSection from "../../components/landing/sections/HeroSection";
import { useLandingSectionScroll } from "../../hooks/useLandingSectionScroll";

const LogoMarqueeSection = lazy(() => import("../../components/landing/sections/LogoMarqueeSection"));
const FeaturesBentoSection = lazy(() => import("../../components/landing/sections/FeaturesBentoSection"));
const HowItWorksSection = lazy(() => import("../../components/landing/sections/HowItWorksSection"));
const PricingSection = lazy(() => import("../../components/landing/sections/PricingSection"));
const FaqSection = lazy(() => import("../../components/landing/sections/FaqSection"));
const FinalCtaSection = lazy(() => import("../../components/landing/sections/FinalCtaSection"));
const FooterSection = lazy(() => import("../../components/landing/sections/FooterSection"));

export default function LandingPage() {
  useLandingSectionScroll();
  const description =
    "Plan collection routes, monitor connected containers, turn citizen reports into action, and track field execution from one EcoTrack workspace.";
  const siteRoot =
    typeof window === "undefined" ? "/" : new URL("/", window.location.origin).toString();
  const structuredData =
    typeof window === "undefined"
      ? undefined
      : [
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "EcoTrack",
            url: siteRoot,
            logo: new URL("/branding/ecotrack-logo-192.png", window.location.origin).toString(),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "EcoTrack",
            url: siteRoot,
            description,
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "EcoTrack",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: siteRoot,
            description,
            featureList: [
              "Route planning and tour orchestration",
              "Citizen reporting intake",
              "Live container monitoring",
              "Collection analytics and heatmaps",
            ],
          },
        ];

  return (
    <div className="landing-root">
      <DocumentMetadata
        title="EcoTrack | Smart Waste Operations Platform"
        description={description}
        canonicalPath="/"
        structuredData={structuredData}
      />
      <GradientGlow />
      <GridOverlay />
      <Vignette />

      <div className="landing-content">
        <Navbar />

        <main>
          <HeroSection />
          <Suspense fallback={null}>
            <LogoMarqueeSection />
            <FeaturesBentoSection />
            <HowItWorksSection />
            <PricingSection />
            <FaqSection />
            <FinalCtaSection />
          </Suspense>
        </main>

        <Suspense fallback={null}>
          <FooterSection />
        </Suspense>
      </div>
    </div>
  );
}

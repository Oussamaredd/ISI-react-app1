import { Suspense, lazy, useEffect, useState } from "react";
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

type IdleCallbackCapableWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

export default function LandingPage() {
  useLandingSectionScroll();
  const [isBelowFoldContentReady, setIsBelowFoldContentReady] = useState(false);
  const description =
    "EcoTrack is a citizen-first waste reporting and collection coordination prototype for the Paris scenario, with citizen reports driving operations and simulated measurements supporting the workflow.";
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
              "Citizen-first reporting and follow-up",
              "Manager planning and operational monitoring",
              "Agent tour execution",
              "Simulated measurement ingestion",
            ],
          },
        ];

  useEffect(() => {
    const idleCapableWindow = window as IdleCallbackCapableWindow;
    const revealBelowFoldContent = () => setIsBelowFoldContentReady(true);

    if (typeof idleCapableWindow.requestIdleCallback === "function") {
      const idleCallbackId = idleCapableWindow.requestIdleCallback(revealBelowFoldContent, {
        timeout: 1200,
      });
      return () => idleCapableWindow.cancelIdleCallback?.(idleCallbackId);
    }

    const timeoutId = globalThis.setTimeout(revealBelowFoldContent, 250);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="landing-root">
      <DocumentMetadata
        title="EcoTrack | Citizen-First Waste Reporting Prototype"
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
          {isBelowFoldContentReady ? (
            <Suspense fallback={null}>
              <LogoMarqueeSection />
              <FeaturesBentoSection />
              <HowItWorksSection />
              <PricingSection />
              <FaqSection />
              <FinalCtaSection />
            </Suspense>
          ) : null}
        </main>

        {isBelowFoldContentReady ? (
          <Suspense fallback={null}>
            <FooterSection />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}

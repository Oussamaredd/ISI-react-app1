import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const HEADER_OFFSET = 104;

const getScrollBehavior = (): ScrollBehavior => {
  if (typeof window === "undefined") {
    return "auto";
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
};

export function scrollToLandingSection(sectionId: string, behavior: ScrollBehavior = getScrollBehavior()) {
  if (typeof document === "undefined") {
    return;
  }

  const target = document.getElementById(sectionId);
  if (!target) {
    return;
  }

  const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top, behavior });
}

const normalizeHash = (hash: string) => hash.replace(/^#/, "").trim();

export function useLandingSectionScroll() {
  React.useEffect(() => {
    const syncHashScroll = () => {
      const sectionId = normalizeHash(window.location.hash);
      if (!sectionId) {
        return;
      }

      window.setTimeout(() => {
        scrollToLandingSection(sectionId, "auto");
      }, 0);
    };

    syncHashScroll();
    window.addEventListener("hashchange", syncHashScroll);
    return () => window.removeEventListener("hashchange", syncHashScroll);
  }, []);
}

export function useLandingSectionNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return React.useCallback(
    (sectionId: string) => {
      const normalizedSectionId = sectionId.trim();
      if (!normalizedSectionId) {
        return;
      }

      const hash = `#${normalizedSectionId}`;

      if (location.pathname === "/") {
        navigate({ pathname: "/", hash }, { replace: location.hash === hash });
        window.setTimeout(() => {
          scrollToLandingSection(normalizedSectionId);
        }, 0);
        return;
      }

      navigate({ pathname: "/", hash });
    },
    [location.hash, location.pathname, navigate],
  );
}

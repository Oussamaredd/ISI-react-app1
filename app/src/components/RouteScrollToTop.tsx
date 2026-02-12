import React from "react";
import { useLocation } from "react-router-dom";

export default function RouteScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (/jsdom/i.test(userAgent)) {
      return;
    }

    if (typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname]);

  return null;
}

import React from "react";
import { useLocation } from "react-router-dom";
import { scrollPageToTop } from "../lib/scrollPageToTop";

export default function RouteScrollToTop() {
  const { pathname, hash } = useLocation();

  React.useEffect(() => {
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (/jsdom/i.test(userAgent)) {
      return;
    }

    if (pathname === "/" && hash) {
      return;
    }

    scrollPageToTop("auto");
  }, [hash, pathname]);

  return null;
}

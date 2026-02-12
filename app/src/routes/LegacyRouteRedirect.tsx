import React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

type LegacyRouteRedirectProps = {
  to: string | ((params: Readonly<Record<string, string | undefined>>) => string);
};

const warnedRoutes = new Set<string>();

export default function LegacyRouteRedirect({ to }: LegacyRouteRedirectProps) {
  const location = useLocation();
  const params = useParams();
  const target = typeof to === "function" ? to(params) : to;

  React.useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    if (!warnedRoutes.has(location.pathname)) {
      warnedRoutes.add(location.pathname);
      console.warn(
        `[LegacyRoute] '${location.pathname}' is deprecated and will be removed. Use '${target}' instead.`,
      );
    }
  }, [location.pathname, target]);

  return (
    <Navigate
      replace
      to={target}
      state={{ legacyNotice: `Bookmark updated: use ${target}` }}
    />
  );
}

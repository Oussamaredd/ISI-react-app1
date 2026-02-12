import type { ReactNode } from "react";
import { API_BASE } from "../services/api";
import { cn } from "../lib/utils";

const AUTH_BASE_URL = `${API_BASE}/api/auth`;
const GOOGLE_AUTH_URL = `${AUTH_BASE_URL}/google`;

type LoginButtonProps = {
  className?: string;
  children?: ReactNode;
};

export default function LoginButton({ className, children }: LoginButtonProps) {
  const handleClick = () => {
    const configuredApiBase = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;
    if (API_BASE === "http://localhost:3001" && !configuredApiBase) {
      console.warn("Warning: VITE_API_BASE_URL not set, using default http://localhost:3001");
    }
  };

  return (
    <a
      href={GOOGLE_AUTH_URL}
      onClick={handleClick}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-6 text-sm font-semibold text-[var(--text)] shadow-[0_10px_28px_rgba(47,109,248,0.35)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(47,109,248,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
        className,
      )}
    >
      {children ?? "Login with Google"}
    </a>
  );
}

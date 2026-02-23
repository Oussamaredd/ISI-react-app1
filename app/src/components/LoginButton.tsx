import type { ReactNode } from 'react';

import { cn } from '../lib/utils';
import { API_BASE } from '../services/api';

const AUTH_BASE_URL = `${API_BASE}/api/auth`;
const GOOGLE_AUTH_URL = `${AUTH_BASE_URL}/google`;

type LoginButtonProps = {
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  onStartSignIn?: () => void;
};

export default function LoginButton({
  className,
  children,
  disabled = false,
  isLoading = false,
  onStartSignIn,
}: LoginButtonProps) {
  const handleClick = () => {
    if (disabled) {
      return;
    }

    const configuredApiBase = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;
    if (API_BASE === 'http://localhost:3001' && !configuredApiBase) {
      console.warn('Warning: VITE_API_BASE_URL not set, using default http://localhost:3001');
    }

    onStartSignIn?.();
    window.location.assign(GOOGLE_AUTH_URL);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={isLoading}
      onClick={handleClick}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-3 rounded-[var(--radius-pill)] border border-[var(--border)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-6 text-sm font-semibold text-[var(--text)] shadow-[0_10px_28px_rgba(47,109,248,0.35)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(47,109,248,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:hover:translate-y-0',
        className,
      )}
    >
      {isLoading ? <span className="auth-inline-spinner" aria-hidden="true" /> : null}
      <span aria-hidden="true" className="text-lg font-extrabold leading-none text-white">
        G
      </span>
      <span>{children ?? 'Google'}</span>
    </button>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import BrandLogo from '../../components/branding/BrandLogo';
import DocumentMetadata from '../../components/DocumentMetadata';
import { useAuth } from '../../hooks/useAuth';
import { authApi, type AuthSuccess } from '../../services/authApi';
import {
  clearPendingAuthRedirect,
  resolveAuthRedirectTarget,
} from '../../services/authRedirect';

const EXCHANGE_RETRY_WINDOW_MS = 10_000;
const EXCHANGE_RETRY_DELAY_MS = 1_000;
const VALIDATION_START_DELAY_MS = 450;
const SUCCESS_REDIRECT_DELAY_MS = 1_000;
const inFlightExchangeByCode = new Map<string, Promise<AuthSuccess>>();

const requestExchangeSession = (code: string) => {
  const existingRequest = inFlightExchangeByCode.get(code);
  if (existingRequest !== undefined) {
    return existingRequest;
  }

  const request = authApi.exchange(code).finally(() => {
    inFlightExchangeByCode.delete(code);
  });
  inFlightExchangeByCode.set(code, request);
  return request;
};

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unable to complete sign in. Please try again.';
};

const isNetworkExchangeError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return /failed to fetch|network|connection/i.test(error.message);
};

export default function AuthCallbackPage() {
  const location = useLocation();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const exchangeCode = (searchParams.get('code') ?? '').trim();
  const callbackError = searchParams.get('error');
  const nextPath = useMemo(() => resolveAuthRedirectTarget(location.search), [location.search]);
  const initialError = callbackError ?? (exchangeCode ? null : 'Missing sign-in code. Please start again from the login page.');
  const flowKey = `${exchangeCode}:${initialError ?? ''}:${nextPath}`;

  return (
    <AuthCallbackFlow
      key={flowKey}
      exchangeCode={exchangeCode}
      initialError={initialError}
      nextPath={nextPath}
    />
  );
}

function AuthCallbackFlow({
  exchangeCode,
  initialError,
  nextPath,
}: {
  exchangeCode: string;
  initialError: string | null;
  nextPath: string;
}) {
  const [attemptVersion, setAttemptVersion] = useState(0);
  const navigate = useNavigate();
  const { login } = useAuth();
  const [phase, setPhase] = useState<'loading' | 'success' | 'error'>(() => (
    initialError ? 'error' : 'loading'
  ));
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  useEffect(() => {
    if (initialError) {
      return;
    }

    let isActive = true;
    let validationTimer: number | null = null;
    let retryTimer: number | null = null;
    let successRedirectTimer: number | null = null;
    const startedAt = Date.now();

    const attemptExchange = async () => {
      if (!isActive) {
        return;
      }

      try {
        const session = await requestExchangeSession(exchangeCode);
        if (!isActive) {
          return;
        }

        login(session);
        setErrorMessage(null);
        setPhase('success');

        successRedirectTimer = window.setTimeout(() => {
          if (!isActive) {
            return;
          }

          clearPendingAuthRedirect();
          navigate(nextPath, { replace: true });
        }, SUCCESS_REDIRECT_DELAY_MS);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const withinRetryWindow = Date.now() - startedAt < EXCHANGE_RETRY_WINDOW_MS;
        if (withinRetryWindow && isNetworkExchangeError(error)) {
          retryTimer = window.setTimeout(() => {
            void attemptExchange();
          }, EXCHANGE_RETRY_DELAY_MS);
          return;
        }

        setPhase('error');
        setErrorMessage(resolveErrorMessage(error));
      }
    };

    validationTimer = window.setTimeout(() => {
      void attemptExchange();
    }, VALIDATION_START_DELAY_MS);

    return () => {
      isActive = false;
      if (validationTimer) {
        window.clearTimeout(validationTimer);
      }
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      if (successRedirectTimer) {
        window.clearTimeout(successRedirectTimer);
      }
    };
  }, [attemptVersion, exchangeCode, initialError, login, navigate, nextPath]);

  return (
    <section className="auth-login-shell auth-compact-shell auth-callback-shell">
      <DocumentMetadata
        title="Signing In | EcoTrack"
        description="Completing secure EcoTrack sign-in."
        canonicalPath="/auth/callback"
        robots="noindex,nofollow"
      />
      <Link to="/" className="auth-brand-link auth-login-brand-link" aria-label="EcoTrack home">
        <BrandLogo
          imageClassName="auth-brand-logo auth-login-brand-logo"
          textClassName="auth-brand-text auth-login-brand-text"
        />
      </Link>

      <div className="auth-authmode-card auth-login-card auth-compact-card auth-callback-card">
        {phase === 'loading' ? (
          <div className="auth-callback-state" role="status" aria-live="polite">
            <span className="auth-status-spinner auth-callback-spinner" aria-hidden="true" />
          </div>
        ) : null}

        {phase === 'success' ? (
          <div className="auth-callback-state auth-callback-state-success" role="status" aria-live="polite">
            <span className="auth-callback-checkmark" aria-hidden="true">
              <svg viewBox="0 0 20 20" focusable="false">
                <path d="M5 10.4 8.1 13.5 15 6.7" />
              </svg>
            </span>
            <h1>Successfully signed in.</h1>
            <p>Redirecting to your workspace...</p>
          </div>
        ) : null}

        {phase === 'error' ? (
          <div className="auth-callback-state auth-callback-state-error" role="alert">
            <h1>Sign-in failed.</h1>
            <p>{errorMessage ?? 'Unable to complete sign in. Please try again.'}</p>
            <div className="auth-callback-actions">
              {!initialError ? (
                <button
                  type="button"
                  onClick={() => {
                    setPhase('loading');
                    setErrorMessage(null);
                    setAttemptVersion((value) => value + 1);
                  }}
                >
                  Retry sign in
                </button>
              ) : null}
              <Link to="/login">Back to login</Link>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

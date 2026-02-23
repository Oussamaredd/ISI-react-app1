import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import BrandLogo from '../../components/branding/BrandLogo';
import LoginButton from '../../components/LoginButton';
import { useApiReady } from '../../hooks/useApiReady';
import { authApi } from '../../services/authApi';

const DEFAULT_REDIRECT = '/app';

const resolveNextPath = (search: string) => {
  const next = new URLSearchParams(search).get('next');
  if (!next) {
    return DEFAULT_REDIRECT;
  }

  const decoded = decodeURIComponent(next);
  return decoded.startsWith('/') ? decoded : DEFAULT_REDIRECT;
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInMethod, setSignInMethod] = useState<'google' | 'jwt' | null>(null);
  const spotlightOverlayRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const configuredApiBase =
    import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
  const { isApiReady } = useApiReady(configuredApiBase);

  const redirectTarget = useMemo(() => resolveNextPath(location.search), [location.search]);
  const oauthError = useMemo(() => new URLSearchParams(location.search).get('error'), [location.search]);
  const isAuthDisabled = !isApiReady || isSigningIn;

  useEffect(() => {
    const overlay = spotlightOverlayRef.current;
    if (!overlay) {
      return;
    }

    let frameId: number | null = null;
    let nextX = window.innerWidth / 2;
    let nextY = window.innerHeight / 2;

    const applySpotlightPosition = () => {
      frameId = null;
      overlay.style.setProperty('--spotlight-x', `${nextX}px`);
      overlay.style.setProperty('--spotlight-y', `${nextY}px`);
    };

    const queueSpotlightPosition = (x: number, y: number) => {
      nextX = x;
      nextY = y;
      if (frameId !== null) {
        return;
      }
      frameId = window.requestAnimationFrame(applySpotlightPosition);
    };

    queueSpotlightPosition(nextX, nextY);

    const handlePointerMove = (event: PointerEvent) => {
      queueSpotlightPosition(event.clientX, event.clientY);
    };

    const handleResize = () => {
      queueSpotlightPosition(window.innerWidth / 2, window.innerHeight / 2);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  const handleGoogleStart = () => {
    setError(null);
    setSignInMethod('google');
    setIsSigningIn(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isApiReady || isSigningIn) {
      return;
    }

    setError(null);
    setSignInMethod('jwt');
    setIsSigningIn(true);

    try {
      const payload = await authApi.login(email, password);
      const params = new URLSearchParams();
      params.set('code', payload.code);
      if (redirectTarget.startsWith('/')) {
        params.set('next', redirectTarget);
      }
      navigate(`/auth/callback?${params.toString()}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
      setIsSigningIn(false);
      setSignInMethod(null);
    }
  };

  return (
    <section className="auth-login-shell auth-compact-shell auth-login-spotlight-shell">
      <div className="auth-login-spotlight-overlay" ref={spotlightOverlayRef} aria-hidden="true" />
      <Link to="/" className="auth-brand-link auth-login-brand-link" aria-label="EcoTrack home">
        <BrandLogo
          imageClassName="auth-brand-logo auth-login-brand-logo"
          textClassName="auth-brand-text auth-login-brand-text"
        />
      </Link>

      <div className="auth-authmode-card auth-login-card auth-compact-card">
        <h1 className="auth-login-title">Welcome back</h1>
        <p className="auth-login-subtitle">Sign in to continue.</p>

        {oauthError ? <p className="auth-error-banner">{oauthError}</p> : null}
        {error ? <p className="auth-error-banner">{error}</p> : null}

        <LoginButton
          className="auth-google-btn auth-login-google-btn"
          disabled={isAuthDisabled}
          isLoading={isSigningIn && signInMethod === 'google'}
          onStartSignIn={handleGoogleStart}
        >
          Continue with Google
        </LoginButton>

        <div className="auth-or-divider auth-login-divider">
          <span>or continue with email</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">
            <span>Email</span>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isAuthDisabled}
              required
            />
          </label>

          <div className="auth-login-password-header">
            <label htmlFor="login-password">Password</label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isAuthDisabled}
            minLength={8}
            required
          />

          <button type="submit" disabled={isAuthDisabled} aria-busy={isSigningIn && signInMethod === 'jwt'}>
            {isSigningIn && signInMethod === 'jwt' ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-login-signup-copy">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </section>
  );
}

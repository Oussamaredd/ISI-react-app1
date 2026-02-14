import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import BrandLogo from '../../components/branding/BrandLogo';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/authApi';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await authApi.signup(email, password, displayName || undefined);
      login(payload);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-login-shell auth-compact-shell">
      <Link to="/" className="auth-brand-link auth-login-brand-link" aria-label="EcoTrack home">
        <BrandLogo
          imageClassName="auth-brand-logo auth-login-brand-logo"
          textClassName="auth-brand-text auth-login-brand-text"
        />
      </Link>

      <div className="auth-authmode-card auth-login-card auth-compact-card">
        <h1 className="auth-login-title">Create your account</h1>
        <p className="auth-login-subtitle">Use email/password for local authentication.</p>
        {error ? <p className="auth-error-banner">{error}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="signup-email">
            <span>Email</span>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label htmlFor="signup-display-name">
            <span>Display name (optional)</span>
            <input
              id="signup-display-name"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={2}
            />
          </label>

          <label htmlFor="signup-password">
            <span>Password</span>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <label htmlFor="signup-confirm-password">
            <span>Confirm password</span>
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-login-signup-copy">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
}

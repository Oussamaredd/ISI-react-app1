import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import BrandLogo from '../../components/branding/BrandLogo';
import { authApi } from '../../services/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDevResetUrl(null);
    setIsSubmitting(true);

    try {
      const payload = await authApi.forgotPassword(email);
      setSuccessMessage('If an account exists for this email, a reset link was generated.');
      setDevResetUrl(payload?.devResetUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process password reset request.');
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
        <h1 className="auth-login-title">Reset your password</h1>
        <p className="auth-login-subtitle">Enter your account email for a one-time reset link.</p>

        {error ? <p className="auth-error-banner">{error}</p> : null}
        {successMessage ? <p className="auth-success-banner">{successMessage}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="forgot-email">
            <span>Email</span>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        {devResetUrl ? (
          <div className="auth-dev-reset-box">
            <p>Development reset URL:</p>
            <a href={devResetUrl}>{devResetUrl}</a>
          </div>
        ) : null}

        <p className="auth-login-signup-copy">
          Remembered your password? <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </section>
  );
}

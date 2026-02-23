import { FormEvent, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import BrandLogo from '../../components/branding/BrandLogo';
import { authApi } from '../../services/authApi';

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const tokenFromQuery = useMemo(
    () => new URLSearchParams(location.search).get('token') ?? '',
    [location.search],
  );

  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccessMessage('Password updated successfully. Redirecting to sign in...');
      window.setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-authmode-shell">
      <div className="auth-authmode-brand">
        <Link to="/" className="auth-brand-link" aria-label="EcoTrack home">
          <BrandLogo imageClassName="auth-brand-logo" textClassName="auth-brand-text" />
        </Link>
        <p className="auth-authmode-eyebrow">Set New Password</p>
        <h1>Choose a new password</h1>
        <p>This token can only be used once and expires automatically.</p>
      </div>

      <div className="auth-authmode-card">
        <h2>Reset password</h2>
        {error ? <p className="auth-error-banner">{error}</p> : null}
        {successMessage ? <p className="auth-success-banner">{successMessage}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!tokenFromQuery ? (
            <label>
              <span>Reset token</span>
              <input
                type="text"
                autoComplete="off"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required
              />
            </label>
          ) : null}

          <label>
            <span>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <label>
            <span>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update password'}
          </button>
        </form>

        <div className="auth-authmode-links">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </section>
  );
}

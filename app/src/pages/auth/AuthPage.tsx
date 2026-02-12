import { Link, useLocation } from "react-router-dom";
import LoginButton from "../../components/LoginButton";

const getNextLabel = (search: string) => {
  const next = new URLSearchParams(search).get("next");
  return next ? decodeURIComponent(next) : "/app/dashboard";
};

export default function AuthPage() {
  const location = useLocation();
  const nextLabel = getNextLabel(location.search);

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">Secure Sign-in</p>
        <h1>Authenticate to access your workspace</h1>
        <p>
          Continue with Google to keep the existing OAuth callback and session flow unchanged.
        </p>
        <LoginButton className="auth-login-link">Log in with Google</LoginButton>
        <p className="auth-next">After sign-in, you will be redirected to `{nextLabel}`.</p>
        <div className="auth-links">
          <Link to="/">Back to landing</Link>
          <Link to="/pricing">View pricing</Link>
          <Link to="/support">Read support</Link>
        </div>
      </div>
    </section>
  );
}

// client/src/components/LoginButton.jsx
import { API_BASE } from "../services/api";

const AUTH_BASE_URL = `${API_BASE}/api/auth`;
const GOOGLE_AUTH_URL = `${AUTH_BASE_URL}/google`;

export default function LoginButton() {
  const handleClick = () => {
    const configuredApiBase = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL;
    if (API_BASE === 'http://localhost:3001' && !configuredApiBase) {
      console.warn('Warning: VITE_API_BASE_URL not set, using default http://localhost:3001');
    }
  };

  return (
    <a href={GOOGLE_AUTH_URL} onClick={handleClick}>
      <button>Login with Google</button>
    </a>
  );
}

// client/src/components/LoginButton.jsx
import { API_BASE } from "../services/api";

const AUTH_BASE_URL = `${API_BASE}/api/auth`;
const GOOGLE_AUTH_URL = `${AUTH_BASE_URL}/google`;

export default function LoginButton() {
  const handleClick = () => {
    if (API_BASE === 'http://localhost:3001' && !import.meta.env.VITE_API_URL) {
      console.warn('Warning: VITE_API_URL not set, using default http://localhost:3001');
    }
  };

  return (
    <a href={GOOGLE_AUTH_URL} onClick={handleClick}>
      <button>Login with Google</button>
    </a>
  );
}

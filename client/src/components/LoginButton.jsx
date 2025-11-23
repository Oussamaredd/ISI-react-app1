// client/src/components/LoginButton.jsx
const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL) ||
  "http://localhost:5000";

export default function LoginButton() {
  return (
    <a href={`${API_BASE}/auth/google`}>
      <button>Login with Google</button>
    </a>
  );
}
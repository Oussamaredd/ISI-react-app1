// client/src/components/LoginButton.jsx
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function LoginButton() {
  return (
    <a href={`${API_BASE}/auth/google`}>
      <button>Login with Google</button>
    </a>
  );
}
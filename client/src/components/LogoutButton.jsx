// client/src/components/LogoutButton.jsx
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function LogoutButton() {
  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, { credentials: "include" });
    // Client-side redirect to your login/home page
    globalThis.location.href = "/";
  };

  return <button onClick={handleLogout}>Logout</button>;
}
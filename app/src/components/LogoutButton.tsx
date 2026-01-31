// client/src/components/LogoutButton.jsx
import { API_BASE } from "../services/api";

const LOGOUT_URL = `${API_BASE}/api/auth/logout`;

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      await fetch(LOGOUT_URL, { method: "POST", credentials: "include" });
      // Reload the page to trigger re-authentication check
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return <button onClick={handleLogout}>Logout</button>;
}

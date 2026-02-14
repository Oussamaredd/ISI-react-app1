import React from "react";
import { useAuth } from "../hooks/useAuth";
import { authApi } from "../services/authApi";

export default function SettingsPage() {
  const { user, refreshAuth } = useAuth();
  const [displayName, setDisplayName] = React.useState(user?.displayName ?? "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");

  React.useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user?.displayName]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDisplayName = displayName.trim();

    if (!normalizedDisplayName) {
      setErrorMessage("Display name is required.");
      setSuccessMessage("");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      await authApi.updateProfile(normalizedDisplayName);
      await refreshAuth();
      setSuccessMessage("Profile updated successfully.");
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="app-content-page">
      <header className="app-content-header">
        <h1>Settings</h1>
        <p>Update your account profile.</p>
      </header>

      <form className="app-settings-card" onSubmit={handleSubmit}>
        <label className="app-settings-field">
          <span>Display Name</span>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={80}
            required
          />
        </label>

        <label className="app-settings-field">
          <span>Email</span>
          <input type="email" value={user?.email ?? ""} disabled />
        </label>

        {errorMessage ? (
          <p className="app-settings-message app-settings-message-error">{errorMessage}</p>
        ) : null}
        {successMessage ? (
          <p className="app-settings-message app-settings-message-success">{successMessage}</p>
        ) : null}

        <div className="app-settings-actions">
          <button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { authApi } from "../services/authApi";

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 80;
const PASSWORD_MIN_LENGTH = 12;
const AVATAR_MAX_BYTES = 1_000_000;
const SUPPORTED_AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

const isValidAvatarUrl = (value: string) => {
  if (!value.trim()) {
    return true;
  }

  if (/^data:image\/(png|jpeg|jpg|webp);base64,[a-zA-Z0-9+/=]+$/i.test(value)) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const getInitials = (value: string) => {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return "U";
  }

  return words.map((word) => word.charAt(0).toUpperCase()).join("");
};

const toTitleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");

export default function SettingsPage() {
  const { user, refreshAuth } = useAuth();
  const avatarUploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = React.useState(user?.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState(user?.avatarUrl ?? "");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");
  const currentDisplayName = (user?.displayName ?? "").trim();
  const currentAvatarUrl = (user?.avatarUrl ?? "").trim();
  const normalizedDisplayName = displayName.trim();
  const normalizedAvatarUrl = avatarUrl.trim();
  const hasProfileChanged =
    normalizedDisplayName !== currentDisplayName || normalizedAvatarUrl !== currentAvatarUrl;
  const hasPasswordInput = Boolean(currentPassword || newPassword || confirmPassword);
  const hasAnyChanges = hasProfileChanged || hasPasswordInput;
  const canUpdatePassword = user?.provider === "local";
  const roleLabel = toTitleCase(user?.role ?? "member");
  const providerLabel = user?.provider === "google" ? "Google SSO" : "Email and password";
  const accountStatusLabel = user?.isActive === false ? "Limited" : "Active";
  const avatarPreviewCandidate = normalizedAvatarUrl || currentAvatarUrl;
  const avatarPreviewUrl = isValidAvatarUrl(avatarPreviewCandidate) ? avatarPreviewCandidate : "";
  const initials = getInitials(normalizedDisplayName || currentDisplayName || user?.email || "User");

  React.useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
  }, [user?.displayName, user?.avatarUrl]);

  const handleAvatarPickerClick = () => {
    avatarUploadInputRef.current?.click();
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!SUPPORTED_AVATAR_MIME_TYPES.includes(selectedFile.type)) {
      setErrorMessage("Please choose a PNG, JPEG, or WEBP image.");
      setSuccessMessage("");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > AVATAR_MAX_BYTES) {
      setErrorMessage("Profile image must be 1 MB or smaller.");
      setSuccessMessage("");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
        setErrorMessage("");
        setSuccessMessage("");
      }
    };
    reader.onerror = () => {
      setErrorMessage("Unable to process selected image. Please try another file.");
      setSuccessMessage("");
    };
    reader.readAsDataURL(selectedFile);
    event.target.value = "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizedDisplayName) {
      setErrorMessage("Display name is required.");
      setSuccessMessage("");
      return;
    }

    if (normalizedDisplayName.length < DISPLAY_NAME_MIN_LENGTH) {
      setErrorMessage(`Display name must be at least ${DISPLAY_NAME_MIN_LENGTH} characters.`);
      setSuccessMessage("");
      return;
    }

    if (normalizedDisplayName.length > DISPLAY_NAME_MAX_LENGTH) {
      setErrorMessage(`Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or less.`);
      setSuccessMessage("");
      return;
    }

    if (!isValidAvatarUrl(normalizedAvatarUrl)) {
      setErrorMessage("Profile image is invalid. Please pick a valid image file.");
      setSuccessMessage("");
      return;
    }

    if (hasPasswordInput) {
      if (!canUpdatePassword) {
        setErrorMessage("Password changes are available only for local accounts.");
        setSuccessMessage("");
        return;
      }

      if (!currentPassword) {
        setErrorMessage("Current password is required.");
        setSuccessMessage("");
        return;
      }

      if (newPassword.length < PASSWORD_MIN_LENGTH) {
        setErrorMessage(`New password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
        setSuccessMessage("");
        return;
      }

      if (newPassword !== confirmPassword) {
        setErrorMessage("New password and confirmation do not match.");
        setSuccessMessage("");
        return;
      }

      if (currentPassword === newPassword) {
        setErrorMessage("New password must be different from your current password.");
        setSuccessMessage("");
        return;
      }
    }

    if (!hasProfileChanged && !hasPasswordInput) {
      setErrorMessage("");
      setSuccessMessage("Profile is already up to date.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      let profileUpdated = false;
      let passwordUpdated = false;

      if (hasProfileChanged) {
        await authApi.updateProfile(normalizedDisplayName, normalizedAvatarUrl || null);
        await refreshAuth();
        profileUpdated = true;
      }

      if (hasPasswordInput) {
        await authApi.changePassword(currentPassword, newPassword);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        passwordUpdated = true;
      }

      if (profileUpdated && passwordUpdated) {
        setSuccessMessage("Profile and password updated successfully.");
      } else if (profileUpdated) {
        setSuccessMessage("Profile updated successfully.");
      } else if (passwordUpdated) {
        setSuccessMessage("Password changed successfully.");
      }
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(error instanceof Error ? error.message : "Failed to update account settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setDisplayName(user?.displayName ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    setSuccessMessage("");
  };

  return (
    <section className="app-content-page app-settings-page">
      <header className="app-content-header">
        <h1>Account Settings</h1>
        <p>Manage your profile, sign-in credentials, and account security in one place.</p>
      </header>

      <div className="app-settings-layout">
        <form className="app-settings-form" onSubmit={handleSubmit}>
          <section className="app-settings-card app-settings-card-primary">
            <div className="app-settings-card-heading">
              <h2>Profile details</h2>
              <p>Keep your identity details current across your EcoTrack workspace.</p>
            </div>

            <div className="app-settings-avatar-row">
              <button
                type="button"
                className="app-settings-avatar-button"
                onClick={handleAvatarPickerClick}
                aria-label="Upload profile picture"
                title="Upload profile picture"
              >
                <span className="app-settings-avatar-preview" aria-hidden="true">
                  {avatarPreviewUrl ? <img src={avatarPreviewUrl} alt="" /> : <span>{initials}</span>}
                </span>
              </button>
              <input
                ref={avatarUploadInputRef}
                className="app-settings-avatar-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarFileChange}
              />
              <div className="app-settings-avatar-copy">
                <h3>Profile picture</h3>
                <p>Click your avatar to upload a photo (PNG, JPEG, WEBP up to 1 MB).</p>
                <button type="button" className="app-settings-text-button" onClick={() => setAvatarUrl("")}>
                  Remove photo
                </button>
              </div>
            </div>

            <div className="app-settings-form-grid">
              <label className="app-settings-field" htmlFor="displayName">
                <span>Display Name</span>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                  required
                  aria-describedby="displayNameHint"
                />
                <small id="displayNameHint" className="app-settings-hint">
                  This name appears on tickets, dashboards, and activity updates.
                </small>
              </label>

              <label className="app-settings-field" htmlFor="emailAddress">
                <span>Email Address</span>
                <input id="emailAddress" type="email" value={user?.email ?? ""} disabled />
                <small className="app-settings-hint">
                  Email is managed by your provider and cannot be edited here.
                </small>
              </label>
            </div>
          </section>

          <section className="app-settings-card">
            <div className="app-settings-card-heading">
              <h2>Password reset</h2>
              <p>Update your password and keep your account secure.</p>
            </div>

            <div className="app-settings-form-grid">
              <label className="app-settings-field" htmlFor="currentPassword">
                <span>Current Password</span>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  disabled={!canUpdatePassword}
                  autoComplete="current-password"
                />
              </label>

              <label className="app-settings-field" htmlFor="newPassword">
                <span>New Password</span>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={!canUpdatePassword}
                  autoComplete="new-password"
                />
                <small className="app-settings-hint">
                  Minimum {PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, number, and symbol.
                </small>
              </label>

              <label className="app-settings-field" htmlFor="confirmPassword">
                <span>Confirm New Password</span>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={!canUpdatePassword}
                  autoComplete="new-password"
                />
              </label>
            </div>

            {!canUpdatePassword ? (
              <p className="app-settings-inline-note">
                This account uses Google SSO. Manage password security from your Google account.
              </p>
            ) : null}

            {errorMessage ? (
              <p className="app-settings-message app-settings-message-error" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="app-settings-message app-settings-message-success" role="status">
                {successMessage}
              </p>
            ) : null}

            <div className="app-settings-actions">
              <Link className="app-settings-link app-settings-link-muted" to="/forgot-password">
                Forgot password?
              </Link>
              <button
                type="button"
                className="app-settings-secondary-action"
                onClick={handleReset}
                disabled={isSaving}
              >
                Reset form
              </button>
              <button type="submit" disabled={isSaving || !hasAnyChanges}>
                {isSaving ? "Saving..." : "Save Account"}
              </button>
            </div>
          </section>
        </form>

        <div className="app-settings-overview-stack">
          <article className="app-settings-card">
            <div className="app-settings-card-heading">
              <h2>Account overview</h2>
              <p>Current role and authentication configuration.</p>
            </div>

            <dl className="app-settings-summary-list">
              <div className="app-settings-summary-item">
                <dt>Email</dt>
                <dd>{user?.email ?? "Not available"}</dd>
              </div>
              <div className="app-settings-summary-item">
                <dt>Role</dt>
                <dd>{roleLabel}</dd>
              </div>
              <div className="app-settings-summary-item">
                <dt>Authentication</dt>
                <dd>{providerLabel}</dd>
              </div>
              <div className="app-settings-summary-item">
                <dt>Account status</dt>
                <dd>
                  <span className="app-settings-status-chip">{accountStatusLabel}</span>
                </dd>
              </div>
            </dl>
          </article>

          <article className="app-settings-card">
            <div className="app-settings-card-heading">
              <h2>Security overview</h2>
              <p>Best-practice guidance for account safety.</p>
            </div>

            <ul className="app-settings-security-list">
              <li>Use a unique password for EcoTrack and avoid password reuse.</li>
              <li>Sign out from shared devices after your session.</li>
              <li>Contact support if account activity looks unusual.</li>
            </ul>

            <Link className="app-settings-link" to="/app/support">
              Contact support
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

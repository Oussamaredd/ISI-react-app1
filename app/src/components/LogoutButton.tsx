import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

type LogoutButtonProps = {
  className?: string;
  label?: string;
  compact?: boolean;
  icon?: React.ReactNode;
};

export default function LogoutButton({
  className,
  label = "Logout",
  compact = false,
  icon,
}: LogoutButtonProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsSubmitting(true);
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonLabel = isSubmitting ? "Signing out..." : label;

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className}
      disabled={isSubmitting}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
    >
      {icon ? <span className="logout-button-icon" aria-hidden="true">{icon}</span> : null}
      <span className="logout-button-label">{buttonLabel}</span>
    </button>
  );
}

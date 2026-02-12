import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "link";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "border border-[var(--border)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-[var(--text)] shadow-[0_10px_24px_rgba(47,109,248,0.3)] hover:shadow-[0_16px_34px_rgba(47,109,248,0.42)]",
  secondary:
    "border border-[var(--border)] bg-[color:var(--surface)] text-[var(--text)] hover:border-[color:var(--accent-soft)] hover:bg-[color:var(--surface-strong)]",
  outline:
    "border border-[var(--border)] bg-transparent text-[var(--text)] hover:border-[color:var(--accent-soft)] hover:bg-white/5",
  ghost: "border border-transparent bg-transparent text-[var(--text)] hover:bg-white/10",
  link: "h-auto border-none bg-transparent p-0 text-[var(--accent-soft)] shadow-none hover:text-[var(--text)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] font-semibold transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button };

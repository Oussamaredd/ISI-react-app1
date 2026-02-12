import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {}

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]",
        className,
      )}
      {...props}
    />
  );
}

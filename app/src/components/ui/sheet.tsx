import * as React from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

type SheetProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function Sheet({ open, defaultOpen = false, onOpenChange, children }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = open !== undefined;
  const activeOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  React.useEffect(() => {
    if (!activeOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeOpen]);

  return (
    <SheetContext.Provider value={{ open: activeOpen, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

type SheetTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export function SheetTrigger({ asChild = false, children, ...props }: SheetTriggerProps) {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("SheetTrigger must be used inside Sheet.");
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = child.props as {
      onClick?: React.MouseEventHandler<HTMLElement>;
    };

    return React.cloneElement(child, {
      ...props,
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        childProps.onClick?.(event);
        props.onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
        if (!event.defaultPrevented) {
          context.setOpen(true);
        }
      },
    });
  }

  return (
    <button type="button" {...props} onClick={(event) => {
      props.onClick?.(event);
      if (!event.defaultPrevented) {
        context.setOpen(true);
      }
    }}>
      {children}
    </button>
  );
}

type SheetCloseProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export function SheetClose({ asChild = false, children, ...props }: SheetCloseProps) {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("SheetClose must be used inside Sheet.");
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const childProps = child.props as {
      onClick?: React.MouseEventHandler<HTMLElement>;
    };

    return React.cloneElement(child, {
      ...props,
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        childProps.onClick?.(event);
        props.onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
        if (!event.defaultPrevented) {
          context.setOpen(false);
        }
      },
    });
  }

  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          context.setOpen(false);
        }
      }}
    >
      {children}
    </button>
  );
}

type SheetContentProps = {
  side?: "right" | "left";
  className?: string;
  children: React.ReactNode;
};

export function SheetContent({ side = "right", className, children }: SheetContentProps) {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("SheetContent must be used inside Sheet.");
  }

  if (!context.open || typeof document === "undefined") {
    return null;
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => context.setOpen(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          "absolute bottom-0 top-0 w-[min(86vw,380px)] border-l border-[var(--border)] bg-[color:var(--surface-strong)] p-6 shadow-[0_0_40px_rgba(0,0,0,0.45)]",
          side === "right" ? "right-0 animate-sheet-in-right" : "left-0 animate-sheet-in-left border-r border-l-0",
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white/5 text-[var(--text)]"
          onClick={() => context.setOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-5 space-y-1.5", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold text-[var(--text)]", className)} {...props} />;
}

export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--text-muted)]", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 grid gap-3", className)} {...props} />;
}

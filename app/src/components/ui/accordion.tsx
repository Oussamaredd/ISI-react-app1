import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionContextValue = {
  activeValue: string | null;
  setActiveValue: (value: string) => void;
  collapsible: boolean;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<{ value: string } | null>(null);

type AccordionProps = {
  type?: "single";
  collapsible?: boolean;
  defaultValue?: string;
  className?: string;
  children: React.ReactNode;
};

export function Accordion({
  type = "single",
  collapsible = false,
  defaultValue,
  className,
  children,
}: AccordionProps) {
  const [activeValue, setActiveValue] = React.useState<string | null>(defaultValue ?? null);

  if (type !== "single") {
    throw new Error("Only single accordions are supported in this project.");
  }

  return (
    <AccordionContext.Provider
      value={{
        activeValue,
        collapsible,
        setActiveValue: (value: string) => {
          setActiveValue((previous) => {
            if (previous === value && collapsible) {
              return null;
            }
            return value;
          });
        },
      }}
    >
      <div className={cn("space-y-3", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

type AccordionItemProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};

export function AccordionItem({ value, className, children }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={cn("overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-white/5", className)}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

type AccordionTriggerProps = {
  className?: string;
  children: React.ReactNode;
};

export function AccordionTrigger({ className, children }: AccordionTriggerProps) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!accordion || !item) {
    throw new Error("AccordionTrigger must be used within Accordion and AccordionItem.");
  }

  const isOpen = accordion.activeValue === item.value;

  return (
    <h3>
      <button
        type="button"
        onClick={() => accordion.setActiveValue(item.value)}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-[var(--text)] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
          className,
        )}
        aria-expanded={isOpen}
      >
        <span>{children}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-[var(--text-muted)] transition-transform", isOpen && "rotate-180")}
        />
      </button>
    </h3>
  );
}

type AccordionContentProps = {
  className?: string;
  children: React.ReactNode;
};

export function AccordionContent({ className, children }: AccordionContentProps) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!accordion || !item) {
    throw new Error("AccordionContent must be used within Accordion and AccordionItem.");
  }

  const isOpen = accordion.activeValue === item.value;

  if (!isOpen) {
    return null;
  }

  return <div className={cn("px-5 pb-5 text-sm leading-7 text-[var(--text-muted)]", className)}>{children}</div>;
}

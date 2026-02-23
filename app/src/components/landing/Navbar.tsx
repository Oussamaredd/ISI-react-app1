import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "../../lib/utils";
import useNavbarScrollState from "../../hooks/useNavbarScrollState";
import { useLandingSectionNavigation } from "../../hooks/useLandingSectionScroll";
import { scrollPageToTop } from "../../lib/scrollPageToTop";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import BrandLogo from "../branding/BrandLogo";

const sectionLinks = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const isScrolled = useNavbarScrollState();
  const navigateToSection = useLandingSectionNavigation();

  const onHomeClick = () => {
    setIsOpen(false);
    scrollPageToTop("auto");
  };

  const onSectionClick = (sectionId: string) => {
    navigateToSection(sectionId);
    setIsOpen(false);
  };

  return (
    <header
      className={cn(
        "landing-nav sticky top-0 z-40 transition-all duration-300",
        isScrolled && "landing-nav-scrolled",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
        <Link
          to="/"
          className="inline-flex shrink-0 items-center"
          aria-label="EcoTrack home"
          onClick={onHomeClick}
        >
          <BrandLogo
            imageClassName="h-11 w-11"
            textClassName="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text)]"
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex" aria-label="Landing sections">
          {sectionLinks.map((section) => {
            const isActive = location.hash === `#${section.id}`;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionClick(section.id)}
                className={cn(
                  "text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]",
                  isActive && "text-[var(--text)]",
                )}
              >
                {section.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-pill)] px-4 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text)]"
          >
            Log in
          </Link>
          <Link to="/login">
            <Button size="md">Get Started</Button>
          </Link>
        </div>

        <div className="shrink-0 md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Open navigation menu"
                className="h-10 w-10"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Navigate</SheetTitle>
                <SheetDescription>Jump to any section or continue to sign-in.</SheetDescription>
              </SheetHeader>
              <nav className="grid gap-2">
                {sectionLinks.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onSectionClick(section.id)}
                    className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white/5 px-4 py-3 text-left text-sm font-medium text-[var(--text)]"
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
              <SheetFooter>
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="secondary" className="w-full">
                    Log in
                  </Button>
                </Link>
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button className="w-full">Get Started</Button>
                </Link>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

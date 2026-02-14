import { Link } from "react-router-dom";
import { MARKETING_PAGES } from "../../../pages/landing/marketingPages";
import { Separator } from "../../ui/separator";
import BrandLogo from "../../branding/BrandLogo";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: MARKETING_PAGES.features.label, href: MARKETING_PAGES.features.href },
      { label: MARKETING_PAGES.howItWorks.label, href: MARKETING_PAGES.howItWorks.href },
      { label: MARKETING_PAGES.pricing.label, href: MARKETING_PAGES.pricing.href },
    ],
  },
  {
    title: "Company",
    links: [
      { label: MARKETING_PAGES.about.label, href: MARKETING_PAGES.about.href },
      { label: MARKETING_PAGES.security.label, href: MARKETING_PAGES.security.href },
      { label: MARKETING_PAGES.contact.label, href: MARKETING_PAGES.contact.href },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: MARKETING_PAGES.support.label, href: MARKETING_PAGES.support.href },
      { label: "Log in", href: "/login" },
      { label: "Dashboard", href: "/app/dashboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: MARKETING_PAGES.terms.label, href: MARKETING_PAGES.terms.href },
      { label: MARKETING_PAGES.privacy.label, href: MARKETING_PAGES.privacy.href },
      { label: MARKETING_PAGES.cookies.label, href: MARKETING_PAGES.cookies.href },
    ],
  },
];

export default function FooterSection() {
  return (
    <footer className="landing-section pb-12 pt-10">
      <div className="landing-container">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-1">
            <h3>
              <BrandLogo
                imageClassName="h-11 w-11"
                textClassName="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text)]"
              />
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
              Bridging support and operations with fewer handoff failures.
            </p>
          </div>
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="text-sm font-semibold text-[var(--text)]">{column.title}</h4>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="transition hover:text-[var(--text)]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Separator className="my-8" />
        <p className="text-xs text-[var(--text-muted)]">
          (c) {new Date().getFullYear()} EcoTrack. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

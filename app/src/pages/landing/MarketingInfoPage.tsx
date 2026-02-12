import { Link } from "react-router-dom";
import Navbar from "../../components/landing/Navbar";
import GradientGlow from "../../components/landing/background/GradientGlow";
import GridOverlay from "../../components/landing/background/GridOverlay";
import Vignette from "../../components/landing/background/Vignette";
import FooterSection from "../../components/landing/sections/FooterSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import {
  MARKETING_PAGES,
  MarketingPageKey,
  MarketingPageSection,
} from "./marketingPages";

type MarketingInfoPageProps = {
  pageKey: MarketingPageKey;
};

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-semibold text-[var(--text)]">{title}</h2>
      {description && (
        <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{description}</p>
      )}
    </div>
  );
}

function renderSection(section: MarketingPageSection, sectionIndex: number) {
  if (section.kind === "highlights") {
    return (
      <section
        key={`${section.kind}-${sectionIndex}`}
        className="landing-glass-card landing-reveal rounded-[var(--radius-lg)] p-6 md:p-7"
      >
        <SectionHeader title={section.title} description={section.description} />
        <div className="grid gap-4 md:grid-cols-3">
          {section.items.map((item) => (
            <article key={item.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--text)]">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{item.note}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (section.kind === "cardGrid") {
    const gridClass = section.columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
    return (
      <section
        key={`${section.kind}-${sectionIndex}`}
        className="landing-glass-card landing-reveal rounded-[var(--radius-lg)] p-6 md:p-7"
      >
        <SectionHeader title={section.title} description={section.description} />
        <div className={`grid gap-4 ${gridClass}`}>
          {section.items.map((item) => (
            <article key={item.title} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white/5 p-5">
              <h3 className="text-lg font-semibold text-[var(--text)]">{item.title}</h3>
              {item.meta && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-soft)]">
                  {item.meta}
                </p>
              )}
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{item.description}</p>
              {item.bullets && (
                <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-soft)]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (section.kind === "timeline") {
    return (
      <section
        key={`${section.kind}-${sectionIndex}`}
        className="landing-glass-card landing-reveal rounded-[var(--radius-lg)] p-6 md:p-7"
      >
        <SectionHeader title={section.title} description={section.description} />
        <div className="relative space-y-4 pl-5 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-[var(--border)]">
          {section.items.map((item, index) => (
            <article key={item.title} className="relative rounded-[var(--radius-md)] border border-[var(--border)] bg-white/5 p-5">
              <span className="absolute -left-6 top-6 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[10px] font-semibold text-[var(--accent-soft)]">
                {index + 1}
              </span>
              <h3 className="text-lg font-semibold text-[var(--text)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{item.detail}</p>
              {(item.owner || item.window) && (
                <p className="mt-3 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {item.owner ? `Owner: ${item.owner}` : ""}
                  {item.owner && item.window ? " | " : ""}
                  {item.window ? `Window: ${item.window}` : ""}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (section.kind === "matrix") {
    const templateColumns = `minmax(160px,1.3fr) repeat(${section.columns.length}, minmax(130px,1fr))`;
    return (
      <section
        key={`${section.kind}-${sectionIndex}`}
        className="landing-glass-card landing-reveal rounded-[var(--radius-lg)] p-6 md:p-7"
      >
        <SectionHeader title={section.title} description={section.description} />
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-white/5">
          <div className="grid min-w-[720px]" style={{ gridTemplateColumns: templateColumns }}>
            <div className="border-b border-[var(--border)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Area
            </div>
            {section.columns.map((column) => (
              <div
                key={column}
                className="border-b border-l border-[var(--border)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]"
              >
                {column}
              </div>
            ))}
            {section.rows.map((row, rowIndex) => (
              <div key={row.label} className="contents">
                <div className="px-4 py-3 text-sm font-semibold text-[var(--text)]">{row.label}</div>
                {row.values.map((value, valueIndex) => (
                  <div
                    key={`${row.label}-${valueIndex}`}
                    className={`border-l border-[var(--border)] px-4 py-3 text-sm text-[var(--text-muted)] ${
                      rowIndex < section.rows.length - 1 ? "border-b" : ""
                    }`}
                  >
                    {value}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.kind === "checklist") {
    return (
      <section
        key={`${section.kind}-${sectionIndex}`}
        className="landing-glass-card landing-reveal rounded-[var(--radius-lg)] p-6 md:p-7"
      >
        <SectionHeader title={section.title} description={section.description} />
        <ol className="grid gap-3">
          {section.items.map((item, index) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-white/5 px-4 py-3 text-sm text-[var(--text-muted)]"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-xs font-semibold text-[var(--accent-soft)]">
                {index + 1}
              </span>
              <span className="leading-7">{item}</span>
            </li>
          ))}
        </ol>
        {section.footnote && (
          <p className="mt-4 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {section.footnote}
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      key={`${section.kind}-${sectionIndex}`}
      className="landing-glass-card landing-reveal rounded-[var(--radius-lg)] p-6 md:p-7"
    >
      <SectionHeader title={section.title} description={section.description} />
      <Accordion type="single" collapsible defaultValue="item-0">
        {section.items.map((item, index) => (
          <AccordionItem key={item.question} value={`item-${index}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export default function MarketingInfoPage({ pageKey }: MarketingInfoPageProps) {
  const page = MARKETING_PAGES[pageKey];

  return (
    <div className="landing-root">
      <GradientGlow />
      <GridOverlay />
      <Vignette />

      <div className="landing-content">
        <Navbar />

        <main className="landing-container pb-16 pt-12 md:pt-16">
          <section className="landing-glass-card landing-reveal rounded-[var(--radius-lg)] px-6 py-8 md:px-10 md:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-soft)]">
              {page.eyebrow}
            </p>
            <h1 className="landing-h2 mt-3">{page.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
              {page.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {page.quickFacts.map((fact) => (
                <Badge key={fact}>{fact}</Badge>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={page.primaryCta.href}>
                <Button size="md">{page.primaryCta.label}</Button>
              </Link>
              <Link to={page.secondaryCta.href}>
                <Button variant="outline" size="md">
                  {page.secondaryCta.label}
                </Button>
              </Link>
            </div>
          </section>

          <div className="mt-8 grid gap-5">
            {page.sections.map((section, index) => renderSection(section, index))}
          </div>

          <Separator className="my-10" />
          <p className="text-xs text-[var(--text-muted)]">Last updated: {page.lastUpdated}</p>
        </main>

        <FooterSection />
      </div>
    </div>
  );
}

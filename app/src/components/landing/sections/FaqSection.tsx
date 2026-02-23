import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";

const faqs = [
  {
    question: "Does this change the current OAuth callback flow?",
    answer:
      "No. The login trigger still points to the same backend Google route and callback contract.",
  },
  {
    question: "Can we still access old bookmarks like /dashboard?",
    answer:
      "No. Legacy top-level routes have been removed. Use the current /app/* routes and update saved bookmarks.",
  },
  {
    question: "How does section navigation work from non-root pages?",
    answer:
      "Links target /#section-id and the landing page resolves hash anchors with sticky-header offset handling.",
  },
  {
    question: "Is reduced motion respected?",
    answer:
      "Yes. Animations and marquee behavior degrade automatically when prefers-reduced-motion is enabled.",
  },
];

export default function FaqSection() {
  return (
    <section id="faq" className="landing-section">
      <div className="landing-container py-20">
        <div className="landing-reveal mx-auto max-w-3xl text-center">
          <h2 className="landing-h2">Frequently asked questions</h2>
        </div>
        <div className="landing-reveal mx-auto mt-12 max-w-3xl">
          <Accordion type="single" collapsible defaultValue="item-0">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

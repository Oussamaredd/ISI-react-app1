import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";

const faqs = [
  {
    question: "Who is EcoTrack built for?",
    answer:
      "EcoTrack is designed for municipalities, private waste operators, campuses, and facilities teams that manage collection activity across multiple zones or sites.",
  },
  {
    question: "Do we need sensors on every container to use EcoTrack?",
    answer:
      "No. Teams can start with citizen reports, manual operational updates, and planned routes, then layer in connected-container telemetry where it adds value.",
  },
  {
    question: "How do collection teams use EcoTrack day to day?",
    answer:
      "Managers prioritize zones and build tours, while field crews validate stops, record collection progress, and keep the workspace current during active rounds.",
  },
  {
    question: "What does rollout usually include?",
    answer:
      "Most rollouts start with zones, containers, citizen reporting channels, role setup, and one pilot service area before expanding to wider operations.",
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

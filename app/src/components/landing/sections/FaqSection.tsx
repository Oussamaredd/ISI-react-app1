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
      "EcoTrack is currently framed as a citizen-first waste reporting and collection coordination prototype using the Paris metropolitan area as its example scenario.",
  },
  {
    question: "Do we need sensors on every container to use EcoTrack?",
    answer:
      "No. The current prototype works first from citizen reports, manual operational updates, and planned routes, with simulated measurements adding supporting context where useful.",
  },
  {
    question: "How do collection teams use EcoTrack day to day?",
    answer:
      "Managers prioritize the incoming signal and build tours, while agents validate stops and record collection progress. Citizens then see the available follow-up through report status and resolved totals.",
  },
  {
    question: "What does rollout usually include?",
    answer:
      "In the current school-prototype framing, setup focuses on zones, containers, citizen reporting channels, role setup, and one demo-ready service area rather than a full production rollout.",
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

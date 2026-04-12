import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    q: 'What is Voice DNA?',
    a: 'Voice DNA is Quill\'s proprietary analysis engine. It studies your past posts to identify your unique tone, vocabulary, sentence structure, and rhythm. Every draft you write gets a voice score showing how authentically it sounds like you.',
  },
  {
    q: 'Which platforms do you support?',
    a: 'Quill currently supports LinkedIn and X (formerly Twitter). We\'re working on adding support for more platforms including Threads and Bluesky.',
  },
  {
    q: 'Do I need to pay to try Quill?',
    a: 'Every plan includes a 7-day free trial. You\'ll add a card when you start, but you won\'t be charged until the trial ends unless you cancel first.',
  },
  {
    q: 'How is Quill different from Buffer or Hypefury?',
    a: 'Most scheduling tools help you post — Quill helps you post as yourself. Voice DNA scoring and AI rewriting are unique to Quill, ensuring every post matches your authentic voice.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. There are no long-term contracts. You can cancel your subscription at any time from your account settings, and you\'ll retain access until the end of your billing period.',
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-28 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Frequently asked questions
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

import { Mic, PenLine, Send } from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: Mic,
    title: 'Train your voice',
    description: 'Paste 3–5 of your past posts. Quill analyzes your tone, phrasing, and rhythm to build your unique Voice DNA profile.',
  },
  {
    num: '02',
    icon: PenLine,
    title: 'Write your post',
    description: 'Compose in the editor and get a live voice score as you type. See exactly how much it sounds like you.',
  },
  {
    num: '03',
    icon: Send,
    title: 'Publish everywhere',
    description: 'Schedule to LinkedIn and X simultaneously with one click. Quill adapts formatting for each platform.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 px-6 bg-muted/40">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Three steps to posting that sounds like you
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-10 md:gap-8">
          {steps.map((step) => (
            <div key={step.num} className="text-center md:text-left">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-accent mb-5">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                Step {step.num}
              </p>
              <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
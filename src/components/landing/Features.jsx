import { Fingerprint, Columns2, Clock } from 'lucide-react';

const features = [
  {
    icon: Fingerprint,
    title: 'Voice DNA',
    description:
      'Your writing has a fingerprint. Quill scores every draft against your Voice DNA profile so nothing goes out that doesn\'t sound like you.',
  },
  {
    icon: Columns2,
    title: 'One editor, all platforms',
    description:
      'Write once and see live previews for LinkedIn and X side by side. Formatting adapts automatically to each platform\'s best practices.',
  },
  {
    icon: Clock,
    title: 'Smart scheduling',
    description:
      'Queue posts for optimal engagement times or publish instantly. Quill finds the best windows based on your audience.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Everything you need to post with confidence
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-7 hover:border-primary/30 transition-colors"
            >
              <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center mb-5">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
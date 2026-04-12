import { Button } from '@/components/ui/button';

export default function Hero() {
  return (
    <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-4 py-1.5 mb-8">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-xs font-medium text-accent-foreground">Introducing Voice DNA</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
          Write once. Sound like you.{' '}
          <span className="text-primary">Publish everywhere.</span>
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Quill learns your unique voice, adapts your posts for LinkedIn and X, 
          and handles scheduling — so every post sounds authentically you.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="px-8 text-base">
            <a href="#">Start for free</a>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8 text-base">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">7-day free trial · Cancel anytime</p>
      </div>
    </section>
  );
}

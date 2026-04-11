import { Button } from '@/components/ui/button';

export default function CTABanner() {
  return (
    <section className="py-20 md:py-24 px-6 bg-primary">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary-foreground">
          Ready to post in your own voice?
        </h2>
        <p className="mt-4 text-primary-foreground/80 text-lg">
          Join thousands of creators who write faster and sound better with Quill.
        </p>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="mt-8 px-8 text-base font-semibold"
        >
          <a href="#">Start for free</a>
        </Button>
      </div>
    </section>
  );
}
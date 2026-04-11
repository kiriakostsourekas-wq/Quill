import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Solo',
    price: '$12',
    description: 'For individual creators who want to sound like themselves.',
    features: [
      'LinkedIn + X publishing',
      'Unlimited scheduled posts',
      'Voice DNA profile',
      'Smart scheduling',
    ],
    featured: false,
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For power users who want AI rewriting and deeper insights.',
    features: [
      'Everything in Solo',
      'LinkedIn Carousels',
      'AI voice rewriting',
      'Analytics dashboard',
    ],
    featured: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28 px-6 bg-muted/40">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Simple, transparent pricing
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border bg-card p-8 relative ${
                plan.featured
                  ? 'border-primary shadow-sm'
                  : 'border-border'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}

              <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>

              <div className="mt-6 mb-6">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className="w-full"
                variant={plan.featured ? 'default' : 'outline'}
              >
                <a href="#">Start free trial</a>
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          14-day free trial on all plans. No credit card required.
        </p>
      </div>
    </section>
  );
}
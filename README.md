# Quill Product App

Quill is a Next.js 14 SaaS application for voice-aware social publishing. Users can connect LinkedIn and X, train a Voice DNA profile, draft and schedule posts, and manage billing with Stripe.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma + Supabase Postgres
- Groq for Voice DNA analysis and rewrite flows
- Stripe for billing
- Resend for onboarding welcome email
- Vercel Cron Jobs for scheduled publishing

## Local Development

```bash
npm install
npx prisma generate
npm run dev
```

The app runs locally at `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env` and fill in the required values.

Important:

- `DATABASE_URL` should use the Supabase Session Pooler connection string.
- `CRON_SECRET` is required for Vercel Cron auth.
- `RESEND_API_KEY` is required for onboarding welcome emails.
- `STRIPE_SOLO_PRICE_ID` and `STRIPE_PRO_PRICE_ID` come from Stripe Dashboard -> Product catalog -> each product's Price ID.
- Generate `CRON_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Validation

```bash
npx prisma generate
npx prisma db push --schema prisma/schema.prisma
npm run lint
npm run build
```

## Deploying To Vercel

1. Import the repository as a Next.js project.
2. Add all environment variables from `.env.example`.
3. Set `CRON_SECRET` in Vercel. Vercel Cron will send it automatically as `Authorization: Bearer <CRON_SECRET>` when calling `/api/cron/publish`.
4. Set `RESEND_API_KEY`, `STRIPE_SOLO_PRICE_ID`, and `STRIPE_PRO_PRICE_ID` in Vercel.
5. Ensure `NEXT_PUBLIC_APP_URL` matches the deployed product app domain, e.g. `https://quill-ai.dev`.

Vercel Cron is currently disabled in `vercel.json` so the project deploys cleanly on the Vercel Hobby plan.

If you need automatic scheduled publishing, either:
- upgrade the project to Vercel Pro and re-add the cron entry for `/api/cron/publish`, or
- run the publish sweep from an external scheduler that calls the same route.

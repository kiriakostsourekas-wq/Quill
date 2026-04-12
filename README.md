# Quill Product App

Quill is a Next.js 14 SaaS application for voice-aware social publishing. Users can connect LinkedIn and X, train a Voice DNA profile, draft and schedule posts, and manage billing with Stripe.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma + Supabase Postgres
- Groq for Voice DNA analysis and rewrite flows
- Stripe for billing
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
4. Ensure `NEXT_PUBLIC_APP_URL` matches the deployed product app domain.

`vercel.json` already schedules `/api/cron/publish` to run every minute.

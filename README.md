# Quill Product App

Quill is a Next.js 14 SaaS application for voice-aware social publishing. Users can connect LinkedIn and X, train a Voice DNA profile, draft and schedule posts, and use the full product free during beta.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma + Supabase Postgres
- Groq for Voice DNA analysis and rewrite flows
- Stripe code is retained for future billing reactivation, but billing is currently disabled during beta
- Resend for onboarding welcome email
- External HTTP scheduler for scheduled publishing on Vercel Hobby

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
- `CRON_SECRET` is required for the external scheduler that calls `/api/cron/publish`.
- `NEXT_PUBLIC_AUTO_SCHEDULING_ENABLED=true` enables text-post scheduling in the UI/API after the authenticated external scheduler is active.
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

Use `prisma db push` only for disposable local databases. Production and shared
databases should use the checked-in migration history.

## Database Migrations

Fresh databases can be initialized with:

```bash
npx prisma migrate deploy
```

Migration order is timestamped and should apply as:

1. `20260415_baseline` creates the pre-migration application schema.
2. `20260416_enable_rls_on_sensitive_public_tables` enables RLS on sensitive public tables without adding allow policies.
3. `20260420_add_excluded_posts` adds `VoiceProfile.excludedPosts`.

For an existing production database that was created before Prisma migration
history was checked in, do not run the baseline migration against live tables.
First back up the database and verify the baseline tables, indexes, and foreign
keys already exist. Then mark the baseline as already applied:

```bash
npx prisma migrate resolve --applied 20260415_baseline
```

After that, run:

```bash
npx prisma migrate deploy
```

Use `migrate resolve --applied` only for migrations whose SQL effects are
already present in that database. If the RLS or `excludedPosts` migrations were
also applied manually before this migration history existed, verify the database
state first, then resolve those exact migration names as applied too.

## Deploying To Vercel

1. Import the repository as a Next.js project.
2. Add all environment variables from `.env.example`.
3. Set `CRON_SECRET` in Vercel. Use a random value and keep the same value in the external scheduler's `Authorization` header.
4. Set `NEXT_PUBLIC_AUTO_SCHEDULING_ENABLED=false` until the external scheduler has been created and tested.
5. Set `RESEND_API_KEY`, `STRIPE_SOLO_PRICE_ID`, and `STRIPE_PRO_PRICE_ID` in Vercel.
6. Ensure `NEXT_PUBLIC_APP_URL` matches the deployed product app domain, e.g. `https://quill-ai.dev`.
7. Deploy the app.
8. Create an external HTTP scheduler, such as cron-job.org, to call `GET https://<your-domain>/api/cron/publish` every 5 minutes with `Authorization: Bearer <CRON_SECRET>`.
9. After the scheduler succeeds, set `NEXT_PUBLIC_AUTO_SCHEDULING_ENABLED=true` in Vercel production and redeploy so the UI/API allow scheduled text posts.

Optional LinkedIn post import uses LinkedIn's official Posts API. Keep
`LINKEDIN_READ_POSTS_ENABLED=false` and
`NEXT_PUBLIC_LINKEDIN_READ_POSTS_ENABLED=false` unless the LinkedIn app has
approved `r_member_social` access. `LINKEDIN_API_VERSION` defaults to `202602`.
When read access is unavailable, users should import their LinkedIn export CSV
from the Voice DNA import page.

## Scheduled Publishing

Scheduled publishing on Vercel Hobby must use an external HTTP scheduler. Vercel Cron is not configured in `vercel.json` because the five-minute cadence is not deployable on Hobby.

Use cron-job.org or an equivalent scheduler:

1. Create a new scheduled HTTP job.
2. Set the URL to `https://<your-domain>/api/cron/publish`.
3. Set the method to `GET`.
4. Set the interval to every 5 minutes.
5. Add this request header:

```text
Authorization: Bearer <CRON_SECRET>
```

6. Save and run the job once manually.
7. Confirm the response is a successful JSON payload, then enable `NEXT_PUBLIC_AUTO_SCHEDULING_ENABLED=true` in production and redeploy.

The scheduler route publishes due scheduled text posts only. Carousel posts remain draft-or-publish-now from the Carousel page.

Keep `CRON_SECRET` set in every environment where the scheduler route is reachable. The route rejects requests without `Authorization: Bearer <CRON_SECRET>` in production.

Set `NEXT_PUBLIC_AUTO_SCHEDULING_ENABLED=false` in preview, staging, or local environments where the authenticated scheduler is not running. When disabled, the compose UI disables scheduling actions, the posts API rejects new scheduled posts, and the cron route returns a no-op response after authorization.

To verify the sweep locally after creating a due scheduled text post:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/publish
```

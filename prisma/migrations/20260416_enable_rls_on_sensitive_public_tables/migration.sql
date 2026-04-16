-- Quill uses Prisma over a direct Postgres connection with custom session cookies.
-- It does not rely on Supabase Auth or PostgREST policies for these core tables.
--
-- Security fix:
-- Enable RLS on sensitive public-schema tables so Supabase anon/authenticated API
-- clients cannot read or mutate them by default.
--
-- Intentionally no allow policies are created here.
-- Prisma/server-side access continues to work through the direct database role.

ALTER TABLE IF EXISTS public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."SocialAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."VoiceProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Post" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PostDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PostPublishAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."OnboardingResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."SavedIdea" ENABLE ROW LEVEL SECURITY;

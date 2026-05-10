-- Baseline schema for Quill before the follow-up migrations:
-- - 20260416_enable_rls_on_sensitive_public_tables
-- - 20260420_add_excluded_posts
--
-- This migration is intended for new databases. Existing databases that already
-- have this schema should mark it as applied instead of running it:
-- npx prisma migrate resolve --applied 20260415_baseline

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "stripeCustomerId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "role" TEXT NOT NULL DEFAULT 'user',
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "linkedinActivityLevel" TEXT,
    "mainTopic" TEXT,
    "contentGoal" TEXT,
    "communicationStyle" TEXT,
    "contrarianBelief" TEXT,
    "userType" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "accountName" TEXT,
    "accountId" TEXT,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postType" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "firstComment" TEXT,
    "documentTitle" TEXT,
    "carouselMode" TEXT,
    "carouselSlides" JSONB,
    "carouselDocumentBase64" TEXT,
    "coverSlide" BOOLEAN NOT NULL DEFAULT false,
    "platforms" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "voiceScore" INTEGER,
    "voiceToneScore" INTEGER,
    "voiceRhythmScore" INTEGER,
    "voiceWordChoiceScore" INTEGER,
    "voiceFeedback" TEXT,
    "voiceTip" TEXT,
    "voiceSignaturePhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "voiceSafeToPublish" BOOLEAN,
    "voiceWeakestSentence" TEXT,
    "voiceSuggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastVoiceScoredAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "errorLog" TEXT,
    "publishLeaseId" TEXT,
    "publishLeaseExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostDelivery" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "externalPostId" TEXT,
    "metadata" JSONB,
    "publishedAt" TIMESTAMP(3),
    "errorLog" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),

    CONSTRAINT "PostDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostPublishAttempt" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PostPublishAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setupSource" TEXT NOT NULL DEFAULT 'linkedin_posts',
    "foundationKey" TEXT,
    "samplePosts" TEXT[],
    "traits" TEXT[],
    "dimensions" JSONB,
    "sentenceLength" TEXT,
    "formality" TEXT,
    "usesQuestions" BOOLEAN NOT NULL DEFAULT false,
    "usesLists" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "lastAnalyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedIdea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "expansion" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedIdea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_userId_platform_key" ON "SocialAccount"("userId", "platform");

-- CreateIndex
CREATE INDEX "Post_status_scheduledAt_idx" ON "Post"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "PostDelivery_postId_status_idx" ON "PostDelivery"("postId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PostDelivery_postId_platform_key" ON "PostDelivery"("postId", "platform");

-- CreateIndex
CREATE INDEX "PostPublishAttempt_postId_createdAt_idx" ON "PostPublishAttempt"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceProfile_userId_key" ON "VoiceProfile"("userId");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostDelivery" ADD CONSTRAINT "PostDelivery_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostPublishAttempt" ADD CONSTRAINT "PostPublishAttempt_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedIdea" ADD CONSTRAINT "SavedIdea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

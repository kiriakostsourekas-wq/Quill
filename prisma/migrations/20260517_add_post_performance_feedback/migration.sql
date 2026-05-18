CREATE TABLE "PostPerformanceFeedback" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "likes" INTEGER,
  "comments" INTEGER,
  "reposts" INTEGER,
  "impressions" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PostPerformanceFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostPerformanceFeedback_postId_key" ON "PostPerformanceFeedback"("postId");
CREATE INDEX "PostPerformanceFeedback_userId_updatedAt_idx" ON "PostPerformanceFeedback"("userId", "updatedAt");
CREATE INDEX "PostPerformanceFeedback_userId_outcome_idx" ON "PostPerformanceFeedback"("userId", "outcome");

ALTER TABLE "PostPerformanceFeedback"
  ADD CONSTRAINT "PostPerformanceFeedback_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostPerformanceFeedback"
  ADD CONSTRAINT "PostPerformanceFeedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."PostPerformanceFeedback" ENABLE ROW LEVEL SECURITY;

import IORedis from "ioredis";
import { Queue, Worker } from "bullmq";
import { absoluteAppUrl } from "@/lib/utils";

const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })
  : null;

export const postPublisherQueue = connection
  ? new Queue("post-publisher", { connection })
  : null;

export async function schedulePost(postId: string, delayMs: number) {
  if (!postPublisherQueue) {
    throw new Error("REDIS_URL is not configured");
  }

  await postPublisherQueue.add(
    "publish-post",
    { postId },
    {
      jobId: postId,
      delay: Math.max(delayMs, 0),
      removeOnComplete: true,
      removeOnFail: true,
    }
  );
}

export async function removeScheduledPost(postId: string) {
  if (!postPublisherQueue) return;
  const existing = await postPublisherQueue.getJob(postId);
  await existing?.remove();
}

export const postPublisherWorker =
  connection && process.env.ENABLE_BULLMQ_WORKER === "true"
    ? new Worker(
        "post-publisher",
        async (job) => {
          await fetch(absoluteAppUrl("/api/publish"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-quill-internal-secret": process.env.ENCRYPTION_KEY ?? "",
            },
            body: JSON.stringify({ postId: job.data.postId }),
          });
        },
        { connection }
      )
    : null;

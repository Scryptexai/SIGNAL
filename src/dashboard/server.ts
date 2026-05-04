import express from "express";
import path from "path";
import { getQueue, updateQueueItemStatus, enqueueNextPost, publishQueueItem } from "../scheduler/QueueManager";
import { getAllTopics, getPostedLog } from "../agent/TopicManager";
import { getRateLimitStatus } from "../utils/rateLimiter";
import { getNextPostTime } from "../scheduler/CronRunner";
import { logger } from "../utils/logger";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- API Routes ---

app.get("/api/status", (_req, res) => {
  res.json({
    posting_enabled: process.env.POSTING_ENABLED === "true",
    post_mode: process.env.POST_MODE ?? "scheduled",
    next_post: getNextPostTime(),
    rate_limit: getRateLimitStatus(),
    queue_length: getQueue().filter((q) => q.status === "pending").length,
  });
});

app.get("/api/queue", (_req, res) => {
  res.json(getQueue());
});

app.post("/api/queue/generate", async (_req, res) => {
  try {
    const item = await enqueueNextPost();
    if (!item) return res.status(404).json({ error: "No topics available" });
    res.json(item);
  } catch (err) {
    logger.error("Generate failed", { err });
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/queue/:id/approve", async (req, res) => {
  const { id } = req.params;
  updateQueueItemStatus(id, "approved");
  const success = await publishQueueItem(id);
  res.json({ success });
});

app.post("/api/queue/:id/reject", (req, res) => {
  const ok = updateQueueItemStatus(req.params.id, "rejected");
  res.json({ success: ok });
});

app.get("/api/topics", (_req, res) => {
  res.json(getAllTopics());
});

app.get("/api/log", (_req, res) => {
  res.json(getPostedLog());
});

app.get("/api/settings", (_req, res) => {
  res.json({
    posting_enabled: process.env.POSTING_ENABLED,
    post_mode: process.env.POST_MODE,
    max_posts_per_day: process.env.MAX_POSTS_PER_DAY,
    default_tone: process.env.DEFAULT_TONE,
    thread_max_tweets: process.env.THREAD_MAX_TWEETS,
  });
});

/** Starts the Express dashboard server. */
export function startDashboard(): void {
  const port = parseInt(process.env.DASHBOARD_PORT ?? "3000", 10);
  app.listen(port, () => {
    logger.info(`Dashboard running at http://localhost:${port}`);
  });
}

export default app;

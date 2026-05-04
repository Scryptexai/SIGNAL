import "dotenv/config";
import { logger } from "./utils/logger";
import { startCronRunner } from "./scheduler/CronRunner";
import { startDashboard } from "./dashboard/server";
import { enqueueNextPost, publishQueueItem } from "./scheduler/QueueManager";

async function main() {
  logger.info("SIGNAL Agent starting...");
  logger.info(`Mode: ${process.env.POST_MODE ?? "scheduled"} | Posting: ${process.env.POSTING_ENABLED}`);

  if (process.env.DASHBOARD_ENABLED === "true") {
    startDashboard();
  }

  const mode = process.env.POST_MODE ?? "scheduled";

  if (mode === "dry-run") {
    logger.info("DRY-RUN mode — generating content without posting");
    const item = await enqueueNextPost();
    if (item) {
      logger.info("Generated content:");
      item.formatted.forEach((t, i) => {
        logger.info(`  [${i + 1}] ${t}`);
      });
      logger.info(`Hashtags: ${item.content.hashtags.join(", ")}`);
      logger.info(`Engagement estimate: ${item.content.engagement_score_estimate}/10`);
    }
    if (process.env.DASHBOARD_ENABLED !== "true") process.exit(0);
    return;
  }

  if (mode === "manual") {
    logger.info("MANUAL mode — content queued for dashboard approval");
    await enqueueNextPost();
    return;
  }

  // Scheduled mode
  startCronRunner();
  logger.info("Scheduler running. Waiting for cron triggers...");
}

main().catch((err) => {
  logger.error("Fatal error", { err: String(err) });
  process.exit(1);
});

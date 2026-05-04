import { TwitterApi } from "twitter-api-v2";
import { logger } from "../utils/logger";
import { canPost, recordPost } from "../utils/rateLimiter";

let client: TwitterApi | null = null;

function getClient(): TwitterApi {
  if (!client) {
    client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: process.env.X_ACCESS_TOKEN!,
      accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
    });
  }
  return client;
}

/**
 * Posts a single tweet. Respects POSTING_ENABLED and POST_MODE guards.
 * Returns the tweet ID if posted, or null in dry-run mode.
 */
export async function postTweet(content: string, replyToId?: string): Promise<string | null> {
  if (process.env.POSTING_ENABLED !== "true") {
    logger.warn("[BLOCKED] POSTING_ENABLED=false — tweet not sent");
    return null;
  }
  if (process.env.POST_MODE === "dry-run") {
    logger.info(`[DRY-RUN] Would post: ${content.slice(0, 80)}...`);
    return `dry-run-${Date.now()}`;
  }
  if (!canPost()) {
    logger.warn("Rate limit reached — skipping post");
    return null;
  }

  const rwClient = getClient().readWrite;
  const params: Parameters<typeof rwClient.v2.tweet>[0] = { text: content };
  if (replyToId) {
    params.reply = { in_reply_to_tweet_id: replyToId };
  }

  const { data } = await rwClient.v2.tweet(params);
  recordPost();
  logger.info(`Tweet posted: ${data.id}`);
  return data.id;
}

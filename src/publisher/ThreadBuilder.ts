import { postTweet } from "./XPublisher";
import { logger } from "../utils/logger";

/**
 * Posts a thread by chaining tweets as replies to each other.
 * Returns array of posted tweet IDs.
 */
export async function postThread(tweets: string[]): Promise<string[]> {
  const ids: string[] = [];
  let replyToId: string | undefined;

  for (const [i, tweet] of tweets.entries()) {
    logger.info(`Posting thread tweet ${i + 1}/${tweets.length}`);
    const id = await postTweet(tweet, replyToId);
    if (!id) {
      logger.warn(`Thread interrupted at tweet ${i + 1}`);
      break;
    }
    ids.push(id);
    replyToId = id;

    // Small delay between tweets to avoid API issues
    if (i < tweets.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return ids;
}

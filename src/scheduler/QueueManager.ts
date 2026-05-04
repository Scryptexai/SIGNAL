import { v4 as uuidv4 } from "uuid";
import { generateContent, type GeneratedContent } from "../agent/ContentBrain";
import { formatContent } from "../agent/ScriptWriter";
import { getNextTopic, markPosted } from "../agent/TopicManager";
import { postTweet } from "../publisher/XPublisher";
import { postThread } from "../publisher/ThreadBuilder";
import { validateContent } from "../utils/validator";
import { logger } from "../utils/logger";

export interface QueueItem {
  id: string;
  content: GeneratedContent;
  formatted: string[];
  status: "pending" | "approved" | "rejected" | "posted";
  created_at: string;
}

// In-memory queue (survives process lifetime, not restarts)
const queue: QueueItem[] = [];

/** Generates content for the next topic and adds it to the queue. */
export async function enqueueNextPost(preferFormat?: "thread" | "single"): Promise<QueueItem | null> {
  const topic = getNextTopic(preferFormat);
  if (!topic) {
    logger.warn("No available topics to enqueue");
    return null;
  }

  const tone = process.env.DEFAULT_TONE ?? "prophetic";
  const content = await generateContent(topic.id, topic.title, topic.angle, topic.format, tone);
  const { tweets } = formatContent(content);

  const validation = validateContent(content.tweets);
  if (!validation.valid) {
    logger.warn("Content validation failed", { errors: validation.errors });
  }

  const item: QueueItem = {
    id: uuidv4(),
    content,
    formatted: tweets,
    status: process.env.DASHBOARD_ENABLED === "true" ? "pending" : "approved",
    created_at: new Date().toISOString(),
  };

  queue.push(item);
  logger.info(`Enqueued: ${topic.id} (status: ${item.status})`);
  return item;
}

/** Posts an approved queue item. */
export async function publishQueueItem(itemId: string): Promise<boolean> {
  const item = queue.find((q) => q.id === itemId);
  if (!item || item.status !== "approved") {
    logger.warn(`Cannot publish item ${itemId}: not found or not approved`);
    return false;
  }

  let success = false;
  if (item.content.type === "thread") {
    const ids = await postThread(item.formatted);
    success = ids.length > 0;
  } else {
    const id = await postTweet(item.formatted[0]);
    success = id !== null;
  }

  if (success) {
    item.status = "posted";
    markPosted(item.content.topic_id);
  }
  return success;
}

/** Called by cron — generates and auto-posts if dashboard approval not required. */
export async function runScheduledPost(preferFormat?: "thread" | "single"): Promise<void> {
  const item = await enqueueNextPost(preferFormat);
  if (!item) return;

  if (item.status === "approved") {
    await publishQueueItem(item.id);
  } else {
    logger.info(`Content queued for manual approval: ${item.id}`);
  }
}

export function getQueue(): QueueItem[] {
  return queue;
}

export function updateQueueItemStatus(itemId: string, status: QueueItem["status"]): boolean {
  const item = queue.find((q) => q.id === itemId);
  if (!item) return false;
  item.status = status;
  return true;
}

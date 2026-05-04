import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

export interface Topic {
  id: string;
  title: string;
  angle: string;
  source_theme: string;
  format: "thread" | "single" | "both";
  priority: 1 | 2 | 3;
  posted: boolean;
  last_posted: string | null;
  tags: string[];
}

const TOPICS_PATH = path.join(__dirname, "../data/topics.json");
const POSTED_PATH = path.join(__dirname, "../data/posted.json");
const COOLDOWN_DAYS = 7;

function loadTopics(): Topic[] {
  return JSON.parse(fs.readFileSync(TOPICS_PATH, "utf-8")) as Topic[];
}

function loadPosted(): Array<{ topic_id: string; posted_at: string }> {
  if (!fs.existsSync(POSTED_PATH)) return [];
  return JSON.parse(fs.readFileSync(POSTED_PATH, "utf-8"));
}

/** Returns the next topic to post, respecting cooldown and priority. */
export function getNextTopic(preferFormat?: "thread" | "single"): Topic | null {
  const topics = loadTopics();
  const posted = loadPosted();
  const now = Date.now();
  const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

  const recentIds = new Set(
    posted
      .filter((p) => now - new Date(p.posted_at).getTime() < cooldownMs)
      .map((p) => p.topic_id)
  );

  const available = topics
    .filter((t) => !recentIds.has(t.id))
    .filter((t) => !preferFormat || t.format === preferFormat || t.format === "both")
    .sort((a, b) => a.priority - b.priority);

  return available[0] ?? null;
}

/** Records a topic as posted. */
export function markPosted(topicId: string): void {
  const posted = loadPosted();
  posted.push({ topic_id: topicId, posted_at: new Date().toISOString() });
  fs.writeFileSync(POSTED_PATH, JSON.stringify(posted, null, 2));
  logger.info(`Topic marked as posted: ${topicId}`);
}

/** Returns all topics. */
export function getAllTopics(): Topic[] {
  return loadTopics();
}

/** Returns posted log. */
export function getPostedLog() {
  return loadPosted();
}

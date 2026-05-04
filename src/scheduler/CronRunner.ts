import cron from "node-cron";
import { logger } from "../utils/logger";
import { runScheduledPost } from "./QueueManager";

const TIMEZONE = "Asia/Jakarta";

interface ScheduleSlot {
  cron: string;
  label: string;
  type: "hook_tweet" | "thread" | "reflective";
}

const POSTING_SCHEDULE: ScheduleSlot[] = [
  { cron: "0 6 * * *",  label: "morning", type: "hook_tweet" },
  { cron: "0 12 * * *", label: "noon",    type: "thread" },
  { cron: "0 20 * * *", label: "night",   type: "reflective" },
];

/** Starts all cron jobs for scheduled posting. */
export function startCronRunner(): void {
  for (const slot of POSTING_SCHEDULE) {
    cron.schedule(
      slot.cron,
      async () => {
        logger.info(`Cron triggered: ${slot.label} (${slot.type})`);
        const preferFormat = slot.type === "thread" ? "thread" : "single";
        await runScheduledPost(preferFormat);
      },
      { timezone: TIMEZONE }
    );
    logger.info(`Scheduled: ${slot.label} @ ${slot.cron} (${TIMEZONE})`);
  }
}

/** Returns next scheduled post time as a human-readable string. */
export function getNextPostTime(): string {
  const now = new Date();
  const jakartaOffset = 7 * 60; // UTC+7
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const localMinutes = (utcMinutes + jakartaOffset) % (24 * 60);

  const slots = [6 * 60, 12 * 60, 20 * 60]; // in minutes from midnight WIB
  const next = slots.find((s) => s > localMinutes) ?? slots[0];
  const h = Math.floor(next / 60).toString().padStart(2, "0");
  const m = (next % 60).toString().padStart(2, "0");
  return `${h}:${m} WIB`;
}

import { logger } from "../utils/logger";

/**
 * Placeholder for future image attachment support.
 * Currently logs the image prompt for manual creation.
 */
export function attachImagePrompt(topicTitle: string, angle: string): void {
  const prompt = `Cinematic dark illustration: ${topicTitle}. ${angle}. Style: mysterious, ancient, digital. No text.`;
  logger.info(`[IMAGE PROMPT] ${prompt}`);
}

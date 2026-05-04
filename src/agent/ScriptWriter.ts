import type { GeneratedContent, TweetItem } from "./ContentBrain";

export interface FormattedThread {
  tweets: string[];
  hashtags: string[];
}

/**
 * Formats generated content into ready-to-post tweet strings.
 * Appends thread numbering and hashtags to the final tweet.
 */
export function formatContent(content: GeneratedContent): FormattedThread {
  const tweets = content.tweets.map((t: TweetItem, idx: number) => {
    let text = t.content.trim();
    // Append thread counter for multi-tweet threads
    if (content.type === "thread" && content.tweets.length > 1) {
      const counter = `\n\n${idx + 1}/${content.tweets.length}`;
      if (text.length + counter.length <= 280) {
        text += counter;
      }
    }
    return text;
  });

  // Append hashtags to last tweet
  if (content.hashtags.length > 0) {
    const hashtagStr = "\n\n" + content.hashtags.map((h) => `#${h}`).join(" ");
    const last = tweets[tweets.length - 1];
    if (last.length + hashtagStr.length <= 280) {
      tweets[tweets.length - 1] = last + hashtagStr;
    }
  }

  return { tweets, hashtags: content.hashtags };
}

/** Truncates a tweet to 280 chars with ellipsis if needed. */
export function truncateTweet(text: string, max = 280): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

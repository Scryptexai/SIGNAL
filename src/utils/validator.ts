const SENSITIVE_TERMS = ["konspirasi", "illuminati", "freemason", "setan", "kafir"];
const MAX_TWEET_LENGTH = 280;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a single tweet string. */
export function validateTweet(content: string): ValidationResult {
  const errors: string[] = [];
  if (content.length > MAX_TWEET_LENGTH) {
    errors.push(`Tweet exceeds ${MAX_TWEET_LENGTH} chars (${content.length})`);
  }
  for (const term of SENSITIVE_TERMS) {
    if (content.toLowerCase().includes(term)) {
      errors.push(`Sensitive term detected: "${term}"`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Validate all tweets in a generated content object. */
export function validateContent(tweets: Array<{ content: string; position: number }>): ValidationResult {
  const allErrors: string[] = [];
  for (const tweet of tweets) {
    const result = validateTweet(tweet.content);
    if (!result.valid) {
      allErrors.push(...result.errors.map((e) => `[tweet ${tweet.position}] ${e}`));
    }
  }
  return { valid: allErrors.length === 0, errors: allErrors };
}

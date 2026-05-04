/**
 * E2E test — runs the full pipeline with mocked Claude + X API.
 * Uses Node 20 built-in test runner. No extra dependencies.
 *
 * Run: node --test src/test/e2e.test.mjs
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Paths ────────────────────────────────────────────────────────────────────
const POSTED_PATH = path.join(__dirname, "../data/posted.json");
const POSTED_BACKUP = POSTED_PATH + ".bak";

// ── Mock Claude response ──────────────────────────────────────────────────────
const MOCK_CONTENT = {
  type: "thread",
  topic_id: "baalbek-trilithon",
  topic_title: "Baalbek Trilithon — Batu 1200 Ton yang Tidak Bisa Diangkat Crane Modern",
  angle: "Teknologi apa yang digunakan untuk memindahkan batu seberat 1200 ton?",
  tweets: [
    { position: 1, content: "Bagaimana jika crane terbesar di dunia pun tidak sanggup mengangkat batu ini?", char_count: 76, is_hook: true },
    { position: 2, content: "Di Baalbek, Lebanon, terdapat batu tunggal seberat 1.200 ton. Batu itu sudah dipindahkan ribuan tahun lalu.", char_count: 104, is_hook: false },
    { position: 3, content: "Crane terbesar hari ini mampu mengangkat 3.000 ton — tapi tidak bisa menjangkau sudut dan presisi yang dibutuhkan.", char_count: 113, is_hook: false },
    { position: 4, content: "Bagaimana jika mereka punya teknologi yang bekerja dengan prinsip berbeda — bukan gaya, tapi frekuensi?", char_count: 101, is_hook: false },
    { position: 5, content: "Apa yang kita sebut 'mitos' mungkin adalah manual teknis yang kita belum bisa baca. Kamu percaya?", char_count: 97, is_hook: false },
  ],
  hashtags: ["baalbek", "teknologi_kuno", "sejarah_tersembunyi"],
  best_post_time: "morning",
  engagement_score_estimate: 8,
};

// ── Inject env before importing modules ──────────────────────────────────────
process.env.ANTHROPIC_API_KEY = "test-key";
process.env.X_API_KEY = "test";
process.env.X_API_SECRET = "test";
process.env.X_ACCESS_TOKEN = "test";
process.env.X_ACCESS_TOKEN_SECRET = "test";
process.env.X_BEARER_TOKEN = "test";
process.env.POST_MODE = "dry-run";
process.env.POSTING_ENABLED = "false";
process.env.MAX_POSTS_PER_DAY = "3";
process.env.DEFAULT_TONE = "prophetic";
process.env.THREAD_MAX_TWEETS = "7";
process.env.DASHBOARD_ENABLED = "false";

// ── Patch @anthropic-ai/sdk before any import uses it ────────────────────────
const Module = require("module");
const _resolveFilename = Module._resolveFilename.bind(Module);
Module._resolveFilename = (request, ...args) => {
  if (request === "@anthropic-ai/sdk") return request;
  return _resolveFilename(request, ...args);
};

class MockAnthropic {
  messages = {
    create: async () => ({
      content: [{ type: "text", text: JSON.stringify(MOCK_CONTENT) }],
    }),
  };
}

// TypeScript's __importDefault wraps the module: mod.__esModule ? mod : { default: mod }
// So we set __esModule: true and put the class on .default
require.cache["@anthropic-ai/sdk"] = {
  id: "@anthropic-ai/sdk",
  filename: "@anthropic-ai/sdk",
  loaded: true,
  exports: { __esModule: true, default: MockAnthropic },
};

// ── Now import project modules (they will pick up the mock) ──────────────────
// We use dist/ (compiled JS) since we're in .mjs context
const distBase = path.join(__dirname, "../../dist");

const { generateContent } = await import(`${distBase}/agent/ContentBrain.js`);
const { formatContent } = await import(`${distBase}/agent/ScriptWriter.js`);
const { getNextTopic, markPosted, getPostedLog } = await import(`${distBase}/agent/TopicManager.js`);
const { validateTweet, validateContent } = await import(`${distBase}/utils/validator.js`);
const { canPost, recordPost, getRateLimitStatus } = await import(`${distBase}/utils/rateLimiter.js`);
const { getToneRules, checkToneViolations } = await import(`${distBase}/agent/ToneCalibrator.js`);
const { getOptimalPostTime, isFriday, isWeekend } = await import(`${distBase}/scheduler/TimeOptimizer.js`);

// ── Test setup/teardown ───────────────────────────────────────────────────────
before(() => {
  if (fs.existsSync(POSTED_PATH)) {
    fs.copyFileSync(POSTED_PATH, POSTED_BACKUP);
  }
  fs.writeFileSync(POSTED_PATH, "[]");
});

after(() => {
  if (fs.existsSync(POSTED_BACKUP)) {
    fs.copyFileSync(POSTED_BACKUP, POSTED_PATH);
    fs.unlinkSync(POSTED_BACKUP);
  } else {
    fs.writeFileSync(POSTED_PATH, "[]");
  }
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ContentBrain", () => {
  test("generates valid JSON content from Claude", async () => {
    const result = await generateContent(
      "baalbek-trilithon",
      "Baalbek Trilithon",
      "Teknologi apa?",
      "thread"
    );
    assert.equal(result.type, "thread");
    assert.equal(result.topic_id, "baalbek-trilithon");
    assert.ok(Array.isArray(result.tweets));
    assert.ok(result.tweets.length >= 1);
    assert.ok(typeof result.engagement_score_estimate === "number");
  });
});

describe("ScriptWriter", () => {
  test("formats thread with counters and hashtags", () => {
    const { tweets } = formatContent(MOCK_CONTENT);
    assert.equal(tweets.length, MOCK_CONTENT.tweets.length);
    // Last tweet should contain hashtags
    const last = tweets[tweets.length - 1];
    assert.ok(last.includes("#baalbek"), `Expected hashtag in: ${last}`);
    // First tweet should have thread counter
    assert.ok(tweets[0].includes("1/5"), `Expected counter in: ${tweets[0]}`);
  });

  test("single tweet has no thread counter", () => {
    const single = { ...MOCK_CONTENT, type: "single", tweets: [MOCK_CONTENT.tweets[0]] };
    const { tweets } = formatContent(single);
    assert.ok(!tweets[0].includes("1/1"));
  });
});

describe("TopicManager", () => {
  test("returns a topic when queue is empty", () => {
    const topic = getNextTopic();
    assert.ok(topic !== null);
    assert.ok(typeof topic.id === "string");
    assert.ok([1, 2, 3].includes(topic.priority));
  });

  test("priority 1 topics come first", () => {
    const topic = getNextTopic();
    assert.equal(topic?.priority, 1);
  });

  test("markPosted prevents same topic within 7 days", () => {
    const topic = getNextTopic();
    assert.ok(topic);
    markPosted(topic.id);
    const next = getNextTopic();
    assert.notEqual(next?.id, topic.id);
  });

  test("posted log records entry", () => {
    const log = getPostedLog();
    assert.ok(log.length >= 1);
    assert.ok(log[0].topic_id);
    assert.ok(log[0].posted_at);
  });
});

describe("Validator", () => {
  test("accepts valid tweet", () => {
    const r = validateTweet("Bagaimana jika teknologi kuno lebih maju dari yang kita kira?");
    assert.ok(r.valid);
    assert.equal(r.errors.length, 0);
  });

  test("rejects tweet over 280 chars", () => {
    const r = validateTweet("x".repeat(281));
    assert.ok(!r.valid);
    assert.ok(r.errors[0].includes("280"));
  });

  test("flags sensitive terms", () => {
    const r = validateTweet("ini tentang konspirasi besar");
    assert.ok(!r.valid);
    assert.ok(r.errors[0].includes("konspirasi"));
  });

  test("validates all tweets in content", () => {
    const r = validateContent(MOCK_CONTENT.tweets);
    assert.ok(r.valid);
  });
});

describe("RateLimiter", () => {
  test("allows posting within limit", () => {
    assert.ok(canPost());
  });

  test("tracks post count", () => {
    const before = getRateLimitStatus().count;
    recordPost();
    assert.equal(getRateLimitStatus().count, before + 1);
  });

  test("blocks posting when limit reached", () => {
    // Fill up to limit
    const { limit } = getRateLimitStatus();
    let { count } = getRateLimitStatus();
    while (count < limit) { recordPost(); count++; }
    assert.ok(!canPost());
  });
});

describe("ToneCalibrator", () => {
  test("returns rules for prophetic tone", () => {
    const rules = getToneRules("prophetic");
    assert.ok(rules.openingPatterns.length > 0);
    assert.ok(rules.forbiddenWords.includes("konspirasi"));
  });

  test("detects tone violations", () => {
    const violations = checkToneViolations("ini konspirasi besar", "prophetic");
    assert.ok(violations.includes("konspirasi"));
  });

  test("clean content has no violations", () => {
    const violations = checkToneViolations("Bagaimana jika peradaban kuno lebih maju?", "prophetic");
    assert.equal(violations.length, 0);
  });
});

describe("TimeOptimizer", () => {
  test("getOptimalPostTime returns valid value", () => {
    const t = getOptimalPostTime();
    assert.ok(["morning", "afternoon", "night"].includes(t));
  });

  test("isFriday returns boolean", () => {
    assert.equal(typeof isFriday(), "boolean");
  });

  test("isWeekend returns boolean", () => {
    assert.equal(typeof isWeekend(), "boolean");
  });
});

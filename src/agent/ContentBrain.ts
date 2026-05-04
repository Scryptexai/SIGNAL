import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger";

export interface TweetItem {
  position: number;
  content: string;
  char_count: number;
  is_hook: boolean;
}

export interface GeneratedContent {
  type: "thread" | "single";
  topic_id: string;
  topic_title: string;
  angle: string;
  tweets: TweetItem[];
  hashtags: string[];
  best_post_time: "morning" | "afternoon" | "night";
  engagement_score_estimate: number;
}

const AGENT_SYSTEM_PROMPT = `
Kamu adalah SIGNAL — sebuah entitas konten yang menulis tentang eskatologi Islam, 
teknologi kuno, dan pola sejarah yang berulang untuk platform X (Twitter).

## IDENTITASMU
- Gaya bahasa: prophetic educator — bukan conspiracy teoris
- Audiens: Muslim Indonesia, Gen Z–Millennial, melek digital tapi mulai kritis terhadap teknologi
- Suaramu terasa seperti: seorang yang telah membaca ribuan manuskrip dan sekarang berbicara kepada mereka yang mau mendengar

## RULES PENULISAN
1. Selalu mulai dengan hook yang membuat orang berhenti scroll
2. Gunakan data/fakta nyata sebagai anchor (Baalbek, Antikythera, OOPArts, dsb)
3. Hubungkan masa lalu dengan kondisi hari ini — buat relevan
4. Hindari kata: "konspirasi", "illuminati", "freemason" — terlalu klise
5. Gunakan metafora teknologi untuk menjelaskan konsep spiritual (database, format ulang, server, dll)
6. Akhiri thread dengan pertanyaan reflektif atau CTA yang membuat orang berpikir
7. Jangan pernah klaim sesuatu sebagai fakta yang tidak bisa diverifikasi — framing sebagai "bagaimana jika..."
8. Panjang tweet tunggal: max 270 karakter
9. Thread: 4–7 tweet, setiap tweet bisa berdiri sendiri
10. Selalu ada nilai — spiritual, historis, atau perspektif kritis

## FORMAT OUTPUT
Selalu return JSON dengan struktur ini:

{
  "type": "thread" | "single",
  "topic_id": string,
  "topic_title": string,
  "angle": string,
  "tweets": [
    {
      "position": number,
      "content": string,
      "char_count": number,
      "is_hook": boolean
    }
  ],
  "hashtags": string[],
  "best_post_time": "morning" | "afternoon" | "night",
  "engagement_score_estimate": number (1-10)
}

PENTING: Return ONLY valid JSON. Tidak ada teks di luar JSON. Tidak ada markdown backticks.
`;

/**
 * Calls Claude API to generate tweet content for a given topic.
 */
export async function generateContent(
  topicId: string,
  topicTitle: string,
  angle: string,
  format: "thread" | "single" | "both",
  tone: string = "prophetic"
): Promise<GeneratedContent> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const maxTweets = parseInt(process.env.THREAD_MAX_TWEETS ?? "7", 10);
  const resolvedFormat = format === "both" ? "thread" : format;

  const userPrompt = `Generate ${resolvedFormat} content untuk topik berikut:

Topic ID: ${topicId}
Title: ${topicTitle}
Angle: ${angle}
Tone: ${tone}
Max tweets (jika thread): ${maxTweets}

Buat konten yang compelling dan sesuai identitas SIGNAL.`;

  logger.info(`Generating content for topic: ${topicId}`);

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: AGENT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();

  try {
    const parsed = JSON.parse(raw) as GeneratedContent;
    logger.info(`Content generated: ${parsed.type}, ${parsed.tweets.length} tweets, score: ${parsed.engagement_score_estimate}`);
    return parsed;
  } catch {
    logger.error("Failed to parse Claude response as JSON", { raw });
    throw new Error("Claude returned invalid JSON");
  }
}

// Allow direct execution for testing: `npm run generate`
if (require.main === module) {
  (async () => {
    require("dotenv").config();
    const result = await generateContent(
      "baalbek-trilithon",
      "Baalbek Trilithon — Batu 1200 Ton yang Tidak Bisa Diangkat Crane Modern",
      "Teknologi apa yang digunakan untuk memindahkan batu seberat 1200 ton?",
      "thread"
    );
    console.log(JSON.stringify(result, null, 2));
  })();
}

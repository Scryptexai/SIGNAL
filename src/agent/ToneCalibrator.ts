type Tone = "prophetic" | "educational" | "provocative";

interface ToneRules {
  openingPatterns: string[];
  forbiddenWords: string[];
  preferredStructure: string;
}

const TONE_RULES: Record<Tone, ToneRules> = {
  prophetic: {
    openingPatterns: ["Bagaimana jika", "Ada yang tidak diceritakan", "Sebelum kamu scroll", "Perhatikan pola ini"],
    forbiddenWords: ["konspirasi", "illuminati", "freemason", "hoax"],
    preferredStructure: "hook → fakta → koneksi spiritual → pertanyaan",
  },
  educational: {
    openingPatterns: ["Fakta yang jarang dibahas:", "Sejarah mencatat:", "Data menunjukkan:", "Penelitian terbaru:"],
    forbiddenWords: ["konspirasi", "illuminati"],
    preferredStructure: "fakta → konteks → implikasi → sumber",
  },
  provocative: {
    openingPatterns: ["Mereka tidak ingin kamu tahu ini.", "Pertanyaan yang tidak boleh ditanya:", "Coba pikirkan:"],
    forbiddenWords: ["konspirasi", "illuminati", "freemason"],
    preferredStructure: "provokasi → bukti → tantangan → CTA",
  },
};

/** Returns tone rules for the given tone string. */
export function getToneRules(tone: string): ToneRules {
  return TONE_RULES[(tone as Tone) ?? "prophetic"] ?? TONE_RULES.prophetic;
}

/** Checks if content violates tone rules. Returns list of violations. */
export function checkToneViolations(content: string, tone: string): string[] {
  const rules = getToneRules(tone);
  return rules.forbiddenWords.filter((w) => content.toLowerCase().includes(w));
}

/** Returns a random opening pattern for the given tone. */
export function getOpeningPattern(tone: string): string {
  const rules = getToneRules(tone);
  const patterns = rules.openingPatterns;
  return patterns[Math.floor(Math.random() * patterns.length)];
}

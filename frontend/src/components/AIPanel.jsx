import React, { useState } from "react";
import { Sparkle, Copy, Check, WarningCircle } from "@phosphor-icons/react";
import { generateContent, errMsg } from "../lib/api";

const MODES = [
  { id: "analysis", label: "Analysis" },
  { id: "social", label: "Social" },
  { id: "alert", label: "Alert" },
];

export default function AIPanel({ subject, data, disabled }) {
  const [mode, setMode] = useState("analysis");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    setOut("");
    try {
      const res = await generateContent({ mode, subject, data });
      setOut(res.content);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(out);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      /* clipboard unavailable */
    }
  };

  return (
    <section
      data-testid="ai-analysis-panel"
      className="border border-ai/30 bg-ai/[0.04]"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ai/20 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkle size={16} weight="fill" className="text-ai" />
          <h3 className="font-head text-[11px] uppercase tracking-[0.22em] text-ai">
            AI Analysis · Claude
          </h3>
        </div>
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              data-testid={`ai-mode-${m.id}`}
              onClick={() => setMode(m.id)}
              className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors duration-100 ${
                mode === m.id
                  ? "border-ai bg-ai/10 text-ai"
                  : "border-border text-dim hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        <button
          data-testid="ai-generate-button"
          onClick={run}
          disabled={disabled || loading}
          className="mb-3 w-full border border-ai bg-ai/10 py-2.5 font-head text-sm font-semibold tracking-tight text-ai transition-colors hover:bg-ai/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <span className="cursor-blink">ANALYZING ON-CHAIN DATA</span>
          ) : (
            `GENERATE ${mode.toUpperCase()} · ${(subject || "—").toUpperCase()}`
          )}
        </button>

        {error && (
          <div
            data-testid="ai-error"
            className="flex items-center gap-2 border border-neg/40 bg-neg/10 p-3 text-xs text-neg"
          >
            <WarningCircle size={14} weight="fill" />
            {error}
          </div>
        )}

        {out && (
          <div className="relative">
            <button
              data-testid="ai-copy-button"
              onClick={copy}
              className="absolute right-0 top-0 flex items-center gap-1 border border-border bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-dim hover:text-white"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <div
              data-testid="ai-output"
              className="whitespace-pre-wrap pr-16 font-head text-sm leading-relaxed text-white/90"
            >
              {out}
            </div>
          </div>
        )}

        {!out && !error && !loading && (
          <p className="text-xs leading-relaxed text-dim">
            Generate a Claude-written intelligence brief grounded in the on-chain data
            shown here. Switch modes for a desk-style analysis, a social post, or a
            one-line alert.
          </p>
        )}
      </div>
    </section>
  );
}

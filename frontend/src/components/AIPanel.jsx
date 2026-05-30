import React, { useState } from "react";
import { Sparkle, Copy, Check, WarningCircle, XLogo } from "@phosphor-icons/react";
import { generateContent, errMsg } from "../lib/api";

const TONES = [
  { id: "analyst", label: "Analyst" },
  { id: "alpha_caller", label: "Alpha" },
  { id: "degen", label: "Degen" },
];
const OUTPUTS = [
  { id: "thread", label: "Thread" },
  { id: "tweet", label: "Tweet" },
  { id: "alert", label: "Alert" },
];

function Choice({ value, current, onClick, testid, children }) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors duration-100 ${
        current === value
          ? "border-ai bg-ai/10 text-ai"
          : "border-border text-dim hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function AIPanel({ dataType, rawData, subject, disabled }) {
  const [tone, setTone] = useState("analyst");
  const [output, setOutput] = useState("thread");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await generateContent({
        data_type: dataType,
        raw_data: rawData,
        tone,
        output_type: output,
      });
      setResult(res);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      /* clipboard unavailable */
    }
  };

  return (
    <section data-testid="ai-analysis-panel" className="border border-ai/30 bg-ai/[0.04]">
      <header className="flex items-center justify-between gap-2 border-b border-ai/20 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkle size={16} weight="fill" className="text-ai" />
          <h3 className="font-head text-[11px] uppercase tracking-[0.22em] text-ai">
            X / Twitter Engine
          </h3>
        </div>
        <XLogo size={15} weight="bold" className="text-dim" />
      </header>

      <div className="space-y-3 p-4">
        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-dim">Tone</div>
          <div className="flex gap-1">
            {TONES.map((t) => (
              <Choice key={t.id} value={t.id} current={tone} onClick={() => setTone(t.id)} testid={`ai-tone-${t.id}`}>
                {t.label}
              </Choice>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-dim">Output</div>
          <div className="flex gap-1">
            {OUTPUTS.map((o) => (
              <Choice key={o.id} value={o.id} current={output} onClick={() => setOutput(o.id)} testid={`ai-output-${o.id}`}>
                {o.label}
              </Choice>
            ))}
          </div>
        </div>

        <button
          data-testid="ai-generate-button"
          onClick={run}
          disabled={disabled || loading}
          className="w-full border border-ai bg-ai/10 py-2.5 font-head text-sm font-semibold tracking-tight text-ai transition-colors hover:bg-ai/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <span className="cursor-blink">GENERATING {output.toUpperCase()}</span>
          ) : (
            `GENERATE ${output.toUpperCase()}`
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

        {result && (
          <div>
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-dim">
              <span data-testid="ai-meta">
                {result.char_count} chars · {result.tweet_count} tweet
                {result.tweet_count > 1 ? "s" : ""}
              </span>
              <button
                data-testid="ai-copy-button"
                onClick={copy}
                className="flex items-center gap-1 border border-border bg-surface px-2 py-1 text-dim hover:text-white"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div
              data-testid="ai-output"
              className="max-h-[420px] overflow-y-auto whitespace-pre-wrap border-l-2 border-ai/40 pl-3 font-head text-sm leading-relaxed text-white/90"
            >
              {result.content}
            </div>
          </div>
        )}

        {!result && !error && !loading && (
          <p className="text-xs leading-relaxed text-dim">
            Generate a data-grounded X/Twitter post about{" "}
            <span className="text-white">{subject || "this view"}</span>. Pick a tone and
            format, then hit generate.
          </p>
        )}
      </div>
    </section>
  );
}

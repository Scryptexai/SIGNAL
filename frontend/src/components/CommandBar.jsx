import React, { useState } from "react";
import { MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";

export default function CommandBar({ onSearch, busy, error }) {
  const [q, setQ] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) onSearch(q.trim());
  };
  return (
    <div className="border-b border-border bg-bg">
      <form
        onSubmit={submit}
        data-testid="command-bar"
        className="flex items-center gap-3 px-6 py-3"
      >
        <div className="relative flex flex-1 items-center">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 text-dim" />
          <input
            data-testid="global-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Resolve an entity (binance, a16z, wintermute) or paste a wallet address (0x…)"
            className="w-full border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-dim/60 focus:border-primary"
          />
        </div>
        <button
          data-testid="global-search-button"
          type="submit"
          disabled={busy}
          className="border border-primary bg-primary px-5 py-2.5 font-head text-sm font-semibold tracking-tight text-white transition-colors hover:bg-[#005bb5] disabled:opacity-50"
        >
          {busy ? "RESOLVING…" : "RESOLVE"}
        </button>
      </form>
      {error && (
        <div
          data-testid="search-error"
          className="flex items-center gap-2 border-t border-neg/30 bg-neg/10 px-6 py-2 text-xs text-neg"
        >
          <WarningCircle size={14} weight="fill" />
          {error}
        </div>
      )}
    </div>
  );
}

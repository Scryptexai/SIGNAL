import React, { useEffect, useState } from "react";
import * as api from "../lib/api";
import Panel from "../components/Panel";
import AIPanel from "../components/AIPanel";
import { usd, partyName, chainLabel, timeAgo } from "../lib/format";
import { WarningCircle, ArrowRight } from "@phosphor-icons/react";

const TIME_WINDOWS = ["1h", "24h", "7d", "30d"];

function Select({ label, value, onChange, options, testid }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-dim">{label}</span>
      <select
        data-testid={testid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-border bg-surface px-2 py-2 text-sm text-white outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o} className="bg-surface">
            {o.label ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function TransactionsView({ catalog }) {
  const [mode, setMode] = useState("transfers");
  const [base, setBase] = useState("binance");
  const [chain, setChain] = useState("");
  const [timeLast, setTimeLast] = useState("24h");
  const [usdGte, setUsdGte] = useState(1000000);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const entityOptions = catalog
    ? Object.values(catalog.entities).flat().map((s) => ({ value: s, label: s }))
    : [{ value: base, label: base }];
  const chainOptions = [{ value: "", label: "All chains" }].concat(
    (catalog?.chains || []).map((c) => ({ value: c, label: chainLabel(c) }))
  );

  const fetchData = async (opts) => {
    setLoading(true);
    setError("");
    try {
      if (opts.mode === "transfers") {
        const d = await api.getTransfers({
          base: opts.base,
          chain: opts.chain || undefined,
          timeLast: opts.timeLast,
          usdGte: opts.usdGte,
          limit: 25,
        });
        setRows(d.transfers || []);
        setCount(d.count);
      } else {
        const d = await api.getSwaps({
          base: opts.base,
          usdGte: Math.min(opts.usdGte, 100000),
          timeLast: opts.timeLast,
          limit: 25,
        });
        setRows(d.swaps || []);
        setCount(d.count);
      }
    } catch (e) {
      setError(api.errMsg(e));
      setRows([]);
      setCount(null);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchData({ mode, base, chain, timeLast, usdGte });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (m) => {
    const nb = m === "swaps" ? "wintermute" : "binance";
    setMode(m);
    setBase(nb);
    setChain("");
    fetchData({ mode: m, base: nb, chain: "", timeLast, usdGte });
  };

  const runQuery = () => fetchData({ mode, base, chain, timeLast, usdGte });

  const aiData = {
    mode,
    base,
    window: timeLast,
    count,
    rows: rows.slice(0, 10).map((r) =>
      mode === "transfers"
        ? {
            usd: r.historicalUSD,
            from: partyName(r.fromAddress),
            to: partyName(r.toAddress),
            chain: r.fromAddress?.chain || r.chain,
          }
        : {
            usd: r.historicalUSD,
            venue: partyName(r.contractAddress),
            pair: `${r.token0Symbol || "?"}/${r.token1Symbol || "?"}`,
            chain: r.chain,
          }
    ),
  };

  return (
    <div className="fade-in p-6">
      <div className="mb-4 flex items-center gap-2">
        {["transfers", "swaps"].map((m) => (
          <button
            key={m}
            data-testid={`txn-tab-${m}`}
            onClick={() => switchMode(m)}
            className={`border px-4 py-2 font-head text-sm font-semibold uppercase tracking-tight transition-colors duration-100 ${
              mode === m
                ? "border-primary bg-primary/10 text-white"
                : "border-border text-dim hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
        <div className="ml-auto text-xs text-dim">
          {count !== null && !loading ? `${count} ${mode} returned` : ""}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3 border border-border bg-surface p-4">
        <Select
          label={mode === "swaps" ? "Trading Entity" : "Base Entity"}
          value={base}
          onChange={setBase}
          options={entityOptions}
          testid="filter-base"
        />
        {mode === "transfers" && (
          <Select label="Chain" value={chain} onChange={setChain} options={chainOptions} testid="filter-chain" />
        )}
        <Select
          label="Window"
          value={timeLast}
          onChange={setTimeLast}
          options={TIME_WINDOWS}
          testid="filter-window"
        />
        <Select
          label="Min USD"
          value={String(usdGte)}
          onChange={(v) => setUsdGte(Number(v))}
          options={[
            { value: "10000", label: "$10K" },
            { value: "100000", label: "$100K" },
            { value: "1000000", label: "$1M" },
            { value: "10000000", label: "$10M" },
          ]}
          testid="filter-usd"
        />
        <button
          data-testid="run-query-button"
          onClick={runQuery}
          disabled={loading}
          className="border border-primary bg-primary px-5 py-2 font-head text-sm font-semibold tracking-tight text-white hover:bg-[#005bb5] disabled:opacity-50"
        >
          {loading ? "QUERYING…" : "RUN QUERY"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel
            title={mode === "transfers" ? "Large Transfers" : "DEX Swaps"}
            sub={`${base} · ${timeLast}`}
          >
            {error ? (
              <div
                data-testid="txn-error"
                className="flex items-center gap-2 border border-neg/40 bg-neg/10 p-3 text-xs text-neg"
              >
                <WarningCircle size={14} weight="fill" />
                {error}
              </div>
            ) : loading ? (
              <p className="text-xs text-dim">Loading feed…</p>
            ) : rows.length === 0 ? (
              <p className="text-xs text-dim">No {mode} matched these filters.</p>
            ) : mode === "transfers" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="transfers-table">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-dim">
                      <th className="pb-2 font-normal">Age</th>
                      <th className="pb-2 font-normal">From</th>
                      <th className="pb-2 font-normal"></th>
                      <th className="pb-2 font-normal">To</th>
                      <th className="pb-2 font-normal">Chain</th>
                      <th className="pb-2 text-right font-normal">USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t, i) => (
                      <tr key={t.id || i} className="border-t border-border/60 hover:bg-surfaceHover">
                        <td className="py-1.5 font-mono text-xs text-dim">{timeAgo(t.blockTimestamp)}</td>
                        <td className="py-1.5 text-white">{partyName(t.fromAddress)}</td>
                        <td className="py-1.5 text-dim"><ArrowRight size={12} /></td>
                        <td className="py-1.5 text-white">{partyName(t.toAddress)}</td>
                        <td className="py-1.5 text-xs text-dim">{chainLabel(t.fromAddress?.chain || t.chain)}</td>
                        <td className="py-1.5 text-right font-mono text-pos">{usd(t.historicalUSD)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="swaps-table">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-dim">
                      <th className="pb-2 font-normal">Age</th>
                      <th className="pb-2 font-normal">Venue</th>
                      <th className="pb-2 font-normal">Pair</th>
                      <th className="pb-2 font-normal">Chain</th>
                      <th className="pb-2 text-right font-normal">USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s, i) => (
                      <tr key={s.id || i} className="border-t border-border/60 hover:bg-surfaceHover">
                        <td className="py-1.5 font-mono text-xs text-dim">{timeAgo(s.blockTimestamp)}</td>
                        <td className="py-1.5 text-white">{partyName(s.contractAddress)}</td>
                        <td className="py-1.5 text-xs text-ai">
                          {s.token0Symbol || "?"}/{s.token1Symbol || "?"}
                        </td>
                        <td className="py-1.5 text-xs text-dim">{chainLabel(s.chain)}</td>
                        <td className="py-1.5 text-right font-mono text-white">{usd(s.historicalUSD)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
        <div className="lg:col-span-4">
          <AIPanel subject={`${base} ${mode}`} data={aiData} disabled={loading || rows.length === 0} />
        </div>
      </div>
    </div>
  );
}

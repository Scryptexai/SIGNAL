import React, { useEffect, useState } from "react";
import * as api from "../lib/api";
import Panel from "../components/Panel";
import AIPanel from "../components/AIPanel";
import { usd, chainLabel, timeAgo, shortAddr } from "../lib/format";
import { WarningCircle, ArrowRight } from "@phosphor-icons/react";

const TIME_WINDOWS = ["1h", "6h", "24h", "7d"];
const MODES = [
  { id: "whales", label: "Whales" },
  { id: "transfers", label: "Transfers" },
  { id: "swaps", label: "Swaps" },
];

const nameOf = (entity, label, address) => entity || label || shortAddr(address);

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
  const [mode, setMode] = useState("whales");
  const [base, setBase] = useState("binance");
  const [timeLast, setTimeLast] = useState("24h");
  const [usdMin, setUsdMin] = useState(1000000);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const entityOptions = catalog
    ? Object.values(catalog.entities).flat().map((s) => ({ value: s, label: s }))
    : [{ value: base, label: base }];

  const fetchData = async (opts) => {
    setLoading(true);
    setError("");
    try {
      let data;
      if (opts.mode === "whales") {
        data = await api.getLarge();
        setRows(data.transfers || []);
      } else if (opts.mode === "transfers") {
        data = await api.getTransfers({
          entity: opts.base,
          time_last: opts.timeLast,
          usd_min: opts.usdMin,
          limit: 25,
        });
        setRows(data.transfers || []);
      } else {
        data = await api.getSwaps({
          entity: opts.base,
          time_last: opts.timeLast,
          usd_min: Math.min(opts.usdMin, 100000),
          limit: 25,
        });
        setRows(data.swaps || []);
      }
    } catch (e) {
      setError(api.errMsg(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData({ mode, base, timeLast, usdMin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (m) => {
    const nb = m === "swaps" ? "wintermute" : "binance";
    setMode(m);
    setBase(nb);
    fetchData({ mode: m, base: nb, timeLast, usdMin });
  };
  const runQuery = () => fetchData({ mode, base, timeLast, usdMin });

  const isSwaps = mode === "swaps";
  const biggest = rows.reduce((a, b) => ((b.usd_value || 0) > (a?.usd_value || 0) ? b : a), null);
  const aiData = isSwaps
    ? biggest && {
        from_entity: biggest.entity,
        from_label: "DEX swap",
        to_entity: `${biggest.from_token || "?"}→${biggest.to_token || "?"}`,
        to_label: "",
        usd_value: biggest.usd_value,
        token_symbol: biggest.from_token,
        chain: biggest.chain,
        hash: biggest.hash,
        timestamp: biggest.timestamp,
      }
    : biggest && {
        from_entity: biggest.from_entity,
        from_label: biggest.from_label,
        to_entity: biggest.to_entity,
        to_label: biggest.to_label,
        usd_value: biggest.usd_value,
        token_symbol: biggest.token_symbol,
        chain: biggest.chain,
        hash: biggest.hash,
        timestamp: biggest.timestamp,
      };

  const subjectLabel = mode === "whales" ? "the biggest whale move" : `${base} ${mode}`;

  return (
    <div className="fade-in p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            data-testid={`txn-tab-${m.id}`}
            onClick={() => switchMode(m.id)}
            className={`border px-4 py-2 font-head text-sm font-semibold uppercase tracking-tight transition-colors duration-100 ${
              mode === m.id ? "border-primary bg-primary/10 text-white" : "border-border text-dim hover:text-white"
            }`}
          >
            {m.label}
          </button>
        ))}
        <div className="ml-auto text-xs text-dim">
          {!loading && rows.length ? `showing ${rows.length} rows` : ""}
        </div>
      </div>

      {mode !== "whales" ? (
        <div className="mb-4 flex flex-wrap items-end gap-3 border border-border bg-surface p-4">
          <Select label={isSwaps ? "Trading Entity" : "Base Entity"} value={base} onChange={setBase} options={entityOptions} testid="filter-base" />
          <Select label="Window" value={timeLast} onChange={setTimeLast} options={TIME_WINDOWS} testid="filter-window" />
          <Select
            label="Min USD"
            value={String(usdMin)}
            onChange={(v) => setUsdMin(Number(v))}
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
      ) : (
        <div className="mb-4 border border-warn/30 bg-warn/5 px-4 py-2.5 text-xs text-warn">
          Live whale feed — all transfers above <span className="font-semibold">$500K</span> in the last 24h, across every tracked chain.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel
            title={mode === "whales" ? "Whale Alert Feed" : mode === "transfers" ? "Large Transfers" : "DEX Swaps"}
            sub={mode === "whales" ? ">$500K · 24h" : `${base} · ${timeLast}`}
          >
            {error ? (
              <div data-testid="txn-error" className="border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
                <div className="flex items-center gap-2 font-semibold">
                  <WarningCircle size={14} weight="fill" /> Feed temporarily unavailable
                </div>
                <div className="mt-1 text-dim">{error}. Press RUN QUERY to retry.</div>
              </div>
            ) : loading ? (
              <p className="text-xs text-dim">Loading feed…</p>
            ) : rows.length === 0 ? (
              <p className="text-xs text-dim">No {mode} matched these filters.</p>
            ) : isSwaps ? (
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
                      <tr key={s.hash || i} className="border-t border-border/60 hover:bg-surfaceHover">
                        <td className="py-1.5 font-mono text-xs text-dim">{timeAgo(s.timestamp)}</td>
                        <td className="py-1.5 text-white">{s.entity || "—"}</td>
                        <td className="py-1.5 text-xs text-ai">{s.from_token || "?"}/{s.to_token || "?"}</td>
                        <td className="py-1.5 text-xs text-dim">{chainLabel(s.chain)}</td>
                        <td className="py-1.5 text-right font-mono text-white">{usd(s.usd_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="transfers-table">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-dim">
                      <th className="pb-2 font-normal">Age</th>
                      <th className="pb-2 font-normal">From</th>
                      <th className="pb-2 font-normal"></th>
                      <th className="pb-2 font-normal">To</th>
                      <th className="pb-2 font-normal">Token</th>
                      <th className="pb-2 font-normal">Chain</th>
                      <th className="pb-2 text-right font-normal">USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t, i) => (
                      <tr key={t.hash || i} className="border-t border-border/60 hover:bg-surfaceHover">
                        <td className="py-1.5 font-mono text-xs text-dim">{timeAgo(t.timestamp)}</td>
                        <td className="py-1.5 text-white">{nameOf(t.from_entity, t.from_label, t.from_address)}</td>
                        <td className="py-1.5 text-dim"><ArrowRight size={12} /></td>
                        <td className="py-1.5 text-white">{nameOf(t.to_entity, t.to_label, t.to_address)}</td>
                        <td className="py-1.5 text-xs text-ai">{t.token_symbol || "—"}</td>
                        <td className="py-1.5 text-xs text-dim">{chainLabel(t.chain)}</td>
                        <td className="py-1.5 text-right font-mono text-pos">{usd(t.usd_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
        <div className="lg:col-span-4">
          <AIPanel dataType="whale_transfer" rawData={aiData || {}} subject={subjectLabel} disabled={loading || !biggest} />
        </div>
      </div>
    </div>
  );
}

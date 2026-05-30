import React, { useEffect, useState } from "react";
import * as api from "../lib/api";
import Panel from "../components/Panel";
import AIPanel from "../components/AIPanel";
import { usd, num, chainLabel, partyName, firstNum } from "../lib/format";
import { Fire, TrendUp, TrendDown, WarningCircle } from "@phosphor-icons/react";

const flattenHolders = (holders) => {
  if (!holders) return [];
  const src =
    holders.entityTopHolders && Object.keys(holders.entityTopHolders).length
      ? holders.entityTopHolders
      : holders.addressTopHolders;
  if (!src) return [];
  const rows = [];
  Object.entries(src).forEach(([chain, list]) =>
    (Array.isArray(list) ? list : []).forEach((h) => {
      rows.push({
        name: h.entity?.name || partyName(h.address) || h.name || "Unknown",
        chain,
        usd: firstNum(h, ["usd", "balanceUSD", "valueUSD"]),
        balance: firstNum(h, ["balance", "amount"]),
        pct: firstNum(h, ["pctOfCap", "pctOfSupply", "share", "percentage"]),
        address: h.address,
      });
    })
  );
  return rows.sort((a, b) => (b.usd || 0) - (a.usd || 0)).slice(0, 12);
};

const flattenFlow = (flow) => {
  if (!Array.isArray(flow)) return [];
  return flow
    .map((f) => {
      const inUSD = Number(f.inUSD) || 0;
      const outUSD = Number(f.outUSD) || 0;
      return {
        name: partyName(f.address) || f.name,
        chain: f.address?.chain || f.chain,
        net: inUSD - outUSD,
        gross: inUSD + outUSD,
      };
    })
    .sort((a, b) => b.gross - a.gross)
    .slice(0, 12);
};

export default function TokensView({ catalog }) {
  const [token, setToken] = useState("ethereum");
  const [flowWindow, setFlowWindow] = useState("24h");
  const [trending, setTrending] = useState([]);
  const [holders, setHolders] = useState(null);
  const [flow, setFlow] = useState(null);
  const [holdersErr, setHoldersErr] = useState("");
  const [flowErr, setFlowErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getTrending().then(setTrending).catch(() => {});
  }, []);

  const loadHolders = (slug) => {
    setHolders(null);
    setHoldersErr("");
    api.getHolders(slug).then(setHolders).catch((e) => setHoldersErr(api.errMsg(e)));
  };
  const loadFlow = (slug, win) => {
    setFlow(null);
    setFlowErr("");
    api.getFlow(slug, win).then(setFlow).catch((e) => setFlowErr(api.errMsg(e)));
  };

  useEffect(() => {
    setLoading(true);
    loadHolders(token);
    loadFlow(token, flowWindow);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onFlowWindow = (w) => {
    setFlowWindow(w);
    loadFlow(token, w);
  };

  const tk = holders?.token;
  const priceChange =
    tk && tk.price24hAgo ? ((tk.price - tk.price24hAgo) / tk.price24hAgo) * 100 : null;
  const holderRows = flattenHolders(holders);
  const flowRows = flattenFlow(flow);

  const tokenOptions = Array.from(
    new Set([...(catalog?.tokens || []), token])
  );

  const aiData = {
    token,
    name: tk?.name,
    symbol: tk?.symbol,
    price: tk?.price,
    priceChange24hPct: priceChange,
    topHolders: holderRows.slice(0, 8).map((h) => ({ name: h.name, usd: h.usd, chain: h.chain })),
  };

  return (
    <div className="fade-in p-6">
      {/* Trending strip */}
      <Panel
        title="Trending Tokens"
        sub="Most-watched assets on Arkham right now"
        className="mb-4"
        right={<Fire size={16} weight="fill" className="text-warn" />}
      >
        {trending.length === 0 ? (
          <p className="text-xs text-dim">Loading trending…</p>
        ) : (
          <div className="flex flex-wrap gap-2" data-testid="trending-list">
            {trending.map((t, i) => {
              const slug = t.identifier?.pricingID || t.symbol;
              return (
                <button
                  key={i}
                  data-testid={`trending-${slug}`}
                  onClick={() => setToken(slug)}
                  className={`flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors duration-100 ${
                    token === slug
                      ? "border-warn bg-warn/10 text-white"
                      : "border-border text-dim hover:border-warn hover:text-white"
                  }`}
                >
                  <span className="font-head font-semibold text-white">{t.symbol?.toUpperCase()}</span>
                  <span className="text-xs text-dim">{t.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Token selector */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-dim">Verified tokens:</span>
        {tokenOptions.map((s) => (
          <button
            key={s}
            data-testid={`token-select-${s}`}
            onClick={() => setToken(s)}
            className={`border px-3 py-1 text-xs transition-colors duration-100 ${
              token === s
                ? "border-primary bg-primary/10 text-white"
                : "border-border text-dim hover:border-primary hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Token header */}
      <div
        data-testid="token-header"
        className="mb-4 flex flex-wrap items-center justify-between gap-4 border border-border bg-surface p-5"
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-dim">Token</div>
          <h1 className="mt-1 font-head text-3xl font-black tracking-tighter text-white">
            {tk ? `${tk.name} · ${tk.symbol?.toUpperCase()}` : token}
          </h1>
        </div>
        {tk && (
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-dim">Price</div>
              <div className="font-head text-2xl font-bold text-white">{usd(tk.price)}</div>
            </div>
            {priceChange !== null && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-dim">24h</div>
                <div
                  className={`flex items-center gap-1 font-head text-2xl font-bold ${
                    priceChange >= 0 ? "text-pos" : "text-neg"
                  }`}
                >
                  {priceChange >= 0 ? <TrendUp size={20} /> : <TrendDown size={20} />}
                  {Math.abs(priceChange).toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Holders */}
        <div className="lg:col-span-5">
          <Panel title="Top Holders" sub="Grouped by entity">
            {holdersErr ? (
              <div className="flex items-center gap-2 border border-neg/40 bg-neg/10 p-3 text-xs text-neg">
                <WarningCircle size={14} weight="fill" />
                {holdersErr}
              </div>
            ) : !holders ? (
              <p className="text-xs text-dim">Loading holders…</p>
            ) : holderRows.length === 0 ? (
              <p className="text-xs text-dim">No holder breakdown available.</p>
            ) : (
              <table className="w-full text-sm" data-testid="holders-table">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-dim">
                    <th className="pb-2 font-normal">Holder</th>
                    <th className="pb-2 font-normal">Chain</th>
                    <th className="pb-2 text-right font-normal">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {holderRows.map((h, i) => (
                    <tr key={i} className="border-t border-border/60 hover:bg-surfaceHover">
                      <td className="py-1.5 text-white">{h.name}</td>
                      <td className="py-1.5 text-xs text-dim">{chainLabel(h.chain)}</td>
                      <td className="py-1.5 text-right font-mono text-white">
                        {h.usd != null ? usd(h.usd) : num(h.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        {/* Flow */}
        <div className="lg:col-span-3">
          <Panel
            title="Top Flow"
            sub="Net token movement"
            right={
              <div className="flex gap-1">
                {["24h", "7d"].map((w) => (
                  <button
                    key={w}
                    data-testid={`flow-window-${w}`}
                    onClick={() => onFlowWindow(w)}
                    className={`border px-2 py-0.5 text-[10px] uppercase ${
                      flowWindow === w ? "border-ai text-ai" : "border-border text-dim"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            }
          >
            {flowErr ? (
              <div className="border border-warn/40 bg-warn/10 p-3 text-xs text-warn" data-testid="flow-unavailable">
                Flow data temporarily unavailable from Arkham for this token. Try
                <span className="font-semibold"> ethereum</span> or another window.
              </div>
            ) : !flow ? (
              <p className="text-xs text-dim">Loading flow…</p>
            ) : flowRows.length === 0 ? (
              <p className="text-xs text-dim">No flow entries returned.</p>
            ) : (
              <div className="space-y-1.5" data-testid="flow-list">
                {flowRows.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 border-t border-border/60 py-1.5 text-sm"
                  >
                    <span className="truncate text-white" title={f.name}>
                      {f.name}
                    </span>
                    <span
                      className={`shrink-0 font-mono ${f.net >= 0 ? "text-pos" : "text-neg"}`}
                    >
                      {f.net >= 0 ? "+" : "−"}
                      {usd(Math.abs(f.net))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* AI */}
        <div className="lg:col-span-4">
          <AIPanel subject={tk?.name || token} data={aiData} disabled={loading} />
        </div>
      </div>
    </div>
  );
}

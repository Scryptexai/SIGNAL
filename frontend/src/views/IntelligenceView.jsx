import React, { useEffect, useMemo, useState } from "react";
import * as api from "../lib/api";
import Panel from "../components/Panel";
import AIPanel from "../components/AIPanel";
import { usd, num, shortAddr, partyName, partyType, chainLabel, sumVals } from "../lib/format";
import { Globe, TwitterLogo, Buildings, Wallet, ArrowSquareOut, WarningCircle } from "@phosphor-icons/react";

const topTokens = (balances, n = 10) => {
  if (!balances) return [];
  const all = [];
  Object.entries(balances).forEach(([chain, list]) =>
    (Array.isArray(list) ? list : []).forEach((t) => all.push({ ...t, chain }))
  );
  return all
    .filter((t) => (t.usd || 0) > 0)
    .sort((a, b) => (b.usd || 0) - (a.usd || 0))
    .slice(0, n);
};
const topChains = (totalBalance, n = 8) => {
  if (!totalBalance) return [];
  return Object.entries(totalBalance)
    .map(([chain, v]) => ({ chain, usd: Number(v) || 0 }))
    .filter((c) => c.usd > 0)
    .sort((a, b) => b.usd - a.usd)
    .slice(0, n);
};
const flattenCps = (cps) => {
  if (!cps || typeof cps !== "object" || Array.isArray(cps)) return [];
  const rows = [];
  Object.entries(cps).forEach(([chain, list]) =>
    (Array.isArray(list) ? list : []).forEach((c) => rows.push({ ...c, chain }))
  );
  return rows.sort((a, b) => (b.usd || 0) - (a.usd || 0)).slice(0, 10);
};

function Stat({ label, value, accent }) {
  return (
    <div className="border border-border bg-bg px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-dim">{label}</div>
      <div className={`mt-1 font-head text-2xl font-bold tracking-tight ${accent || "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

export default function IntelligenceView({ target }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState(null);
  const [cps, setCps] = useState(null);

  useEffect(() => {
    if (!target?.value) return;
    let active = true;
    setLoading(true);
    setError("");
    setProfile(null);
    setBalances(null);
    setCps(null);
    (async () => {
      try {
        if (target.type === "entity") {
          const [p, b] = await Promise.all([
            api.getEntity(target.value),
            api.getEntityBalances(target.value).catch(() => null),
          ]);
          if (!active) return;
          setProfile(p);
          setBalances(b);
          api
            .getCounterparties(target.value)
            .then((c) => active && setCps(c))
            .catch(() => {});
        } else {
          const [p, b] = await Promise.all([
            api.getAddress(target.value),
            api.getAddressBalances(target.value).catch(() => null),
          ]);
          if (!active) return;
          setProfile(p);
          setBalances(b);
        }
      } catch (e) {
        if (active) setError(api.errMsg(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [target]);

  const portfolio = useMemo(() => sumVals(balances?.totalBalance), [balances]);
  const portfolioPrev = useMemo(() => sumVals(balances?.totalBalance24hAgo), [balances]);
  const tokens = useMemo(() => topTokens(balances?.balances), [balances]);
  const chains = useMemo(() => topChains(balances?.totalBalance), [balances]);
  const cpsRows = useMemo(() => flattenCps(cps), [cps]);
  const delta = portfolio - portfolioPrev;
  const deltaPct = portfolioPrev ? (delta / portfolioPrev) * 100 : 0;

  const isEntity = target.type === "entity";
  const title = isEntity ? profile?.name || target.value : shortAddr(target.value);
  const maxChain = chains.length ? chains[0].usd : 1;

  const aiData = useMemo(
    () => ({
      subject: title,
      kind: target.type,
      identifier: target.value,
      entityType: isEntity ? profile?.type : profile?.arkhamEntity?.type,
      portfolioUSD: portfolio,
      change24hUSD: delta,
      topChains: chains.slice(0, 5),
      topTokens: tokens.slice(0, 6).map((t) => ({ symbol: t.symbol, usd: t.usd, chain: t.chain })),
      topCounterparties: cpsRows.slice(0, 6).map((c) => ({
        name: partyName(c.address),
        usd: c.usd,
        txCount: c.transactionCount,
      })),
    }),
    [title, target, profile, portfolio, delta, chains, tokens, cpsRows, isEntity]
  );

  if (error) {
    return (
      <div className="p-6">
        <div
          data-testid="intelligence-error"
          className="flex items-center gap-2 border border-neg/40 bg-neg/10 p-4 text-sm text-neg"
        >
          <WarningCircle size={18} weight="fill" />
          Could not load {target.type} "{target.value}": {error}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in p-6">
      {/* Header card */}
      <div
        data-testid="intel-header"
        className="mb-4 flex flex-wrap items-start justify-between gap-4 border border-border bg-surface p-6"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-dim">
            {isEntity ? <Buildings size={14} /> : <Wallet size={14} />}
            {isEntity ? "Entity Intelligence" : "Address Intelligence"}
          </div>
          <h1 className="mt-2 font-head text-4xl font-black tracking-tighter text-white" data-testid="intel-title">
            {loading ? <span className="cursor-blink text-dim">loading</span> : title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(isEntity ? profile?.type : profile?.arkhamEntity?.type) && (
              <span className="border border-border px-2 py-0.5 text-[11px] uppercase tracking-wider text-ai">
                {isEntity ? profile?.type : profile?.arkhamEntity?.type}
              </span>
            )}
            {!isEntity && profile?.arkhamLabel?.name && (
              <span className="border border-border px-2 py-0.5 text-[11px] text-dim">
                {profile.arkhamLabel.name}
              </span>
            )}
            <span className="font-mono text-xs text-dim">
              {isEntity ? `id: ${profile?.id || target.value}` : target.value}
            </span>
          </div>
          {isEntity && (
            <div className="mt-3 flex flex-wrap gap-3">
              {profile?.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-dim hover:text-primary"
                >
                  <Globe size={13} /> Website <ArrowSquareOut size={11} />
                </a>
              )}
              {profile?.twitter && (
                <a
                  href={profile.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-dim hover:text-primary"
                >
                  <TwitterLogo size={13} /> Twitter <ArrowSquareOut size={11} />
                </a>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Stat label="Portfolio (USD)" value={usd(portfolio)} />
          <Stat
            label="24h Change"
            value={`${delta >= 0 ? "+" : ""}${usd(delta)}`}
            accent={delta >= 0 ? "text-pos" : "text-neg"}
          />
          <Stat label="24h %" value={`${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%`} accent={deltaPct >= 0 ? "text-pos" : "text-neg"} />
          <Stat label="Active Chains" value={num(chains.length)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Holdings */}
        <div className="lg:col-span-5">
          <Panel title="Top Holdings" sub="Largest token positions by USD">
            {loading ? (
              <p className="text-xs text-dim">Loading balances…</p>
            ) : tokens.length === 0 ? (
              <p className="text-xs text-dim">No token balances reported.</p>
            ) : (
              <table className="w-full text-sm" data-testid="holdings-table">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-dim">
                    <th className="pb-2 font-normal">Token</th>
                    <th className="pb-2 font-normal">Chain</th>
                    <th className="pb-2 text-right font-normal">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t, i) => (
                    <tr key={i} className="border-t border-border/60 hover:bg-surfaceHover">
                      <td className="py-1.5">
                        <span className="font-semibold text-white">{t.symbol || "?"}</span>
                        <span className="ml-2 text-xs text-dim">{t.name}</span>
                      </td>
                      <td className="py-1.5 text-xs text-dim">{chainLabel(t.chain)}</td>
                      <td className="py-1.5 text-right font-mono text-white">{usd(t.usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        {/* Chain allocation */}
        <div className="lg:col-span-3">
          <Panel title="Chain Allocation" sub="Balance distribution">
            {loading ? (
              <p className="text-xs text-dim">Loading…</p>
            ) : chains.length === 0 ? (
              <p className="text-xs text-dim">No allocation data.</p>
            ) : (
              <div className="space-y-2.5" data-testid="chain-allocation">
                {chains.map((c) => (
                  <div key={c.chain}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-dim">{chainLabel(c.chain)}</span>
                      <span className="font-mono text-white">{usd(c.usd)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-bg">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.max(2, (c.usd / maxChain) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* AI */}
        <div className="lg:col-span-4">
          <AIPanel subject={title} data={aiData} disabled={loading} />
        </div>

        {/* Counterparties (entity only) */}
        {isEntity && (
          <div className="lg:col-span-12">
            <Panel title="Top Counterparties" sub="Highest-volume interacting addresses (30d)">
              {!cps ? (
                <p className="text-xs text-dim">Loading counterparties…</p>
              ) : cpsRows.length === 0 ? (
                <p className="text-xs text-dim">No counterparty data available.</p>
              ) : (
                <table className="w-full text-sm" data-testid="counterparties-table">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-dim">
                      <th className="pb-2 font-normal">Counterparty</th>
                      <th className="pb-2 font-normal">Type</th>
                      <th className="pb-2 font-normal">Chain</th>
                      <th className="pb-2 text-right font-normal">Volume (USD)</th>
                      <th className="pb-2 text-right font-normal">Txns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpsRows.map((c, i) => (
                      <tr key={i} className="border-t border-border/60 hover:bg-surfaceHover">
                        <td className="py-1.5">
                          <span className="text-white">{partyName(c.address)}</span>
                          <span className="ml-2 font-mono text-[11px] text-dim">
                            {shortAddr(c.address?.address)}
                          </span>
                        </td>
                        <td className="py-1.5 text-xs text-dim">{partyType(c.address) || "—"}</td>
                        <td className="py-1.5 text-xs text-dim">{chainLabel(c.chain)}</td>
                        <td className="py-1.5 text-right font-mono text-white">{usd(c.usd)}</td>
                        <td className="py-1.5 text-right font-mono text-dim">{num(c.transactionCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

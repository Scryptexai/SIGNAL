import React from "react";
import { Crosshair, ArrowsLeftRight, Coins, Pulse } from "@phosphor-icons/react";
import StatusBadge from "./StatusBadge";

const NAV = [
  { id: "intelligence", label: "Intelligence", icon: Crosshair },
  { id: "transactions", label: "Transactions", icon: ArrowsLeftRight },
  { id: "tokens", label: "Tokens", icon: Coins },
];

export default function Sidebar({ tab, onTab, status, catalog, onSelectEntity, activeEntity }) {
  return (
    <aside className="flex w-[252px] shrink-0 flex-col border-r border-border bg-bg">
      <div className="flex items-center gap-3 border-b border-border px-5 py-[18px]">
        <Pulse size={24} weight="bold" className="text-ai" />
        <div>
          <div className="font-head text-xl font-black leading-none tracking-tighter">
            SIGNAL
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.32em] text-dim">
            On-Chain Intel
          </div>
        </div>
      </div>

      <nav className="border-b border-border p-3">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.id;
          return (
            <button
              key={n.id}
              data-testid={`nav-${n.id}`}
              onClick={() => onTab(n.id)}
              className={`mb-1 flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left text-sm transition-colors duration-100 ${
                active
                  ? "border-primary bg-surface text-white"
                  : "border-transparent text-dim hover:bg-surface hover:text-white"
              }`}
            >
              <Icon size={18} weight={active ? "fill" : "regular"} />
              <span className="font-head tracking-tight">{n.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-1 pb-2 text-[10px] uppercase tracking-[0.2em] text-dim/60">
          Tracked Entities
        </div>
        {catalog &&
          Object.entries(catalog.entities).map(([cat, slugs]) => (
            <div key={cat} className="mb-4">
              <div className="px-1 pb-1.5 text-[10px] uppercase tracking-[0.18em] text-dim/80">
                {(catalog.categories && catalog.categories[cat]) || cat}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {slugs.map((s) => (
                  <button
                    key={s}
                    data-testid={`entity-chip-${s}`}
                    onClick={() => onSelectEntity(s)}
                    className={`border px-2 py-1 text-[11px] transition-colors duration-100 ${
                      activeEntity === s
                        ? "border-primary bg-primary/10 text-white"
                        : "border-border text-dim hover:border-primary hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>

      <div className="p-3">
        <StatusBadge status={status} />
      </div>
    </aside>
  );
}

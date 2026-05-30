import React from "react";

export default function StatusBadge({ status }) {
  const online = status?.arkham === "online";
  const claude = !!status?.claude;
  return (
    <div
      data-testid="arkham-status-badge"
      className="flex items-center justify-between border border-border bg-surface px-3 py-2.5"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
              online ? "animate-ping bg-pos" : "bg-neg"
            }`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              online ? "bg-pos" : "bg-neg"
            }`}
          />
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-dim">
          Arkham{" "}
          <span className={online ? "text-pos" : "text-neg"}>
            {online ? "ONLINE" : status ? "OFFLINE" : "…"}
          </span>
        </span>
      </div>
      <span
        className="text-[10px] uppercase tracking-[0.18em] text-dim"
        title="Claude AI engine"
      >
        AI <span className={claude ? "text-ai" : "text-neg"}>{claude ? "READY" : "OFF"}</span>
      </span>
    </div>
  );
}

import React from "react";

export default function Panel({ title, sub, right, children, accent = false, className = "" }) {
  const id = (title || "panel").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <section
      data-testid={`panel-${id}`}
      className={`border bg-surface ${
        accent ? "border-ai/30" : "border-border"
      } ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="font-head text-[11px] uppercase tracking-[0.22em] text-dim">
            {title}
          </h3>
          {sub && <p className="mt-0.5 truncate text-[11px] text-dim/70">{sub}</p>}
        </div>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

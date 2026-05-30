export const usd = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const a = Math.abs(Number(n));
  const sign = Number(n) < 0 ? "-" : "";
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(2)}K`;
  return `${sign}$${a.toFixed(2)}`;
};

export const num = (n) =>
  n === null || n === undefined || isNaN(n)
    ? "—"
    : Number(n).toLocaleString("en-US", { maximumFractionDigits: 4 });

export const shortAddr = (a) =>
  !a ? "—" : a.length > 16 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;

export const chainLabel = (c) => (c ? String(c).replace(/_/g, " ") : "—");

export const timeAgo = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts).getTime();
  if (isNaN(d)) return "—";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 0) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export const partyName = (p) => {
  if (!p) return "—";
  if (typeof p === "string") return shortAddr(p);
  return (
    (p.arkhamEntity && p.arkhamEntity.name) ||
    (p.arkhamLabel && p.arkhamLabel.name) ||
    shortAddr(p.address)
  );
};

export const partyType = (p) => {
  if (!p || typeof p !== "object") return "";
  return (p.arkhamEntity && p.arkhamEntity.type) || (p.contract ? "contract" : "");
};

// Find the first numeric value among candidate keys.
export const firstNum = (obj, keys) => {
  if (!obj) return null;
  for (const k of keys) {
    if (typeof obj[k] === "number") return obj[k];
  }
  return null;
};

export const sumVals = (o) =>
  o ? Object.values(o).reduce((a, b) => a + (Number(b) || 0), 0) : 0;

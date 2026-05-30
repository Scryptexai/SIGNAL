import React, { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import CommandBar from "./components/CommandBar";
import IntelligenceView from "./views/IntelligenceView";
import TransactionsView from "./views/TransactionsView";
import TokensView from "./views/TokensView";
import { getCatalog, getStatus, resolveSearch, errMsg } from "./lib/api";

export default function App() {
  const [tab, setTab] = useState("intelligence");
  const [catalog, setCatalog] = useState(null);
  const [status, setStatus] = useState(null);
  const [target, setTarget] = useState({ type: "entity", value: "binance" });
  const [busy, setBusy] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => {});
    const poll = () =>
      getStatus()
        .then(setStatus)
        .catch(() => setStatus({ arkham: "offline", ai: false }));
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  const onSearch = useCallback(async (q) => {
    setBusy(true);
    setSearchError("");
    try {
      const res = await resolveSearch(q);
      const first = (res.results || [])[0];
      if (!first) {
        setSearchError(`No entity or address found for "${q}"`);
        return;
      }
      const isAddr = first.type === "address";
      setTarget({ type: isAddr ? "address" : "entity", value: isAddr ? first.address : first.entity_label });
      setTab("intelligence");
    } catch (e) {
      setSearchError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const selectEntity = useCallback((slug) => {
    setTarget({ type: "entity", value: slug });
    setTab("intelligence");
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-white">
      <Sidebar
        tab={tab}
        onTab={setTab}
        status={status}
        catalog={catalog}
        onSelectEntity={selectEntity}
        activeEntity={target.type === "entity" ? target.value : null}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <CommandBar onSearch={onSearch} busy={busy} error={searchError} />
        <main className="grid-backdrop flex-1 overflow-y-auto" data-testid="main-content">
          {tab === "intelligence" && <IntelligenceView target={target} />}
          {tab === "transactions" && <TransactionsView catalog={catalog} />}
          {tab === "tokens" && <TokensView catalog={catalog} />}
        </main>
      </div>
    </div>
  );
}

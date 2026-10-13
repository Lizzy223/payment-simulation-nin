import { useCallback, useState } from "react";
import CitizenLookup from "./components/CitizenLookup.jsx";
import CheckoutForm from "./components/CheckoutForm.jsx";
import Receipt from "./components/Receipt.jsx";
import ApiInspector from "./components/ApiInspector.jsx";
import PaymentsTable from "./components/PaymentsTable.jsx";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { fullName } from "./lib/format.js";

export default function App() {
  const [tab, setTab] = useState("checkout");
  const [citizen, setCitizen] = useState(null);
  const [done, setDone] = useState(null); // { payment, citizen }
  const [logs, setLogs] = useState([]);
  const [fillCard, setFillCard] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const addLog = useCallback((entry) => {
    setLogs((l) => [...l, { id: crypto.randomUUID(), at: new Date(), ...entry }]);
  }, []);

  const startOver = () => {
    setDone(null);
    setCitizen(null);
    setFillCard(null);
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1>NIN update payment sandbox</h1>
          <p className="sub">Simulated gateway. No real money moves and no card data is sent anywhere.</p>
        </div>
        <span className={`pill ${isSupabaseConfigured ? "pill-ok" : "pill-warn"}`}>
          {isSupabaseConfigured ? "Connected to Supabase" : "Supabase not set, using browser storage"}
        </span>
      </header>

      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "checkout"} onClick={() => setTab("checkout")}>
          Pay for NIN update
        </button>
        <button role="tab" aria-selected={tab === "payments"} onClick={() => setTab("payments")}>
          Saved payments
        </button>
      </nav>

      {tab === "payments" ? (
        <PaymentsTable refreshKey={refreshKey} />
      ) : done ? (
        <Receipt payment={done.payment} citizen={done.citizen} onNew={startOver} />
      ) : (
        <main className="grid">
          <section className="panel">
            {!citizen ? (
              <CitizenLookup onSelect={setCitizen} />
            ) : (
              <>
                <div className="citizen-card">
                  <div>
                    <strong>{fullName(citizen)}</strong>
                    <div className="muted mono">{citizen.crn || "No CRN"} · NIN {citizen.nin_masked}</div>
                  </div>
                  <button type="button" className="link" onClick={() => setCitizen(null)}>Change</button>
                </div>
                <CheckoutForm
                  citizen={citizen}
                  addLog={addLog}
                  fillCard={fillCard}
                  onComplete={(r) => {
                    setDone(r);
                    setRefreshKey((k) => k + 1);
                  }}
                />
              </>
            )}
          </section>
          <ApiInspector logs={logs} onClear={() => setLogs([])} onPickCard={setFillCard} />
        </main>
      )}
    </div>
  );
}
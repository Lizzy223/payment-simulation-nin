import { useEffect, useRef } from "react";
import { TEST_CARDS } from "../lib/mockPaymentApi.js";

export default function ApiInspector({ logs, onClear, onPickCard }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [logs]);

  return (
    <aside className="inspector" aria-label="API inspector">
      <section className="cards">
        <h2>Test cards</h2>
        <p className="muted">Select one to fill the form. Any other valid number succeeds.</p>
        <ul>
          {TEST_CARDS.map((c) => (
            <li key={c.number}>
              <button type="button" onClick={() => onPickCard(c.number + "")}>
                <span className="mono">{c.number}</span>
                <span className={c.outcome === "success" ? "tag tag-ok" : "tag tag-err"}>{c.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="log">
        <div className="log-head">
          <h2>Request log</h2>
          <button type="button" className="link" onClick={onClear} disabled={!logs.length}>Clear</button>
        </div>
        {logs.length === 0 ? (
          <p className="muted">Submit a payment to see the request, gateway response and database write here.</p>
        ) : (
          <ol>
            {logs.map((l) => (
              <li key={l.id} className={`entry entry-${l.kind}`}>
                <div className="entry-title">
                  <span>{l.title}</span>
                  <time>{l.at.toLocaleTimeString()}</time>
                </div>
                <pre>{JSON.stringify(l.data, null, 2)}</pre>
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </section>
    </aside>
  );
}

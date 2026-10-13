import { useEffect, useState } from "react";
import { searchCitizens } from "../lib/supabase.js";
import { fullName } from "../lib/format.js";

export default function CitizenLookup({ onSelect }) {
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (term.trim().length < 2) {
      setRows([]);
      setState("idle");
      return;
    }
    setState("loading");
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data, error } = await searchCitizens(term);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setState("error");
      } else {
        setRows(data);
        setState("done");
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term]);

  return (
    <section>
      <div className="field">
        <label htmlFor="lookup">Find the citizen</label>
        <input
          id="lookup"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Name, CRN or last digits of the NIN"
          autoComplete="off"
        />
        <p className="muted hint">Type at least 2 characters. Try “Okafor” or “CRN-100202”.</p>
      </div>

      {state === "loading" && <p className="muted">Searching…</p>}
      {state === "error" && <p className="notice notice-err">Search failed: {error}</p>}
      {state === "done" && rows.length === 0 && <p>No citizen matches “{term.trim()}”.</p>}

      {rows.length > 0 && (
        <ul className="results">
          {rows.map((c) => (
            <li key={c.citizen_id}>
              <button type="button" disabled={c.is_deceased} onClick={() => onSelect(c)}>
                <span>
                  <strong>{fullName(c)}</strong>
                  <span className="muted"> · born {c.date_of_birth}</span>
                  <br />
                  <span className="muted mono">{c.crn || "No CRN"} · NIN {c.nin_masked}</span>
                </span>
                {c.is_deceased ? (
                  <span className="tag tag-err">Deceased record</span>
                ) : c.nin_status === "updated" ? (
                  <span className="tag tag-ok">NIN updated</span>
                ) : (
                  <span className="tag tag-neutral">Update pending</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
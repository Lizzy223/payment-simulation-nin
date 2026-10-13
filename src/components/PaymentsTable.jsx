import { useEffect, useState } from "react";
import { isSupabaseConfigured, listPayments } from "../lib/supabase.js";
import { money } from "../lib/format.js";

export default function PaymentsTable({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    listPayments().then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setState("error");
      } else {
        setRows(data);
        setState("ready");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <main className="panel wide">
      <h2>Saved payments</h2>
      <p className="muted">
        Source: {isSupabaseConfigured ? "Supabase table public.payments" : "this browser (add Supabase keys to .env to use your database)"}
      </p>
      {state === "loading" && <p>Loading…</p>}
      {state === "error" && <p className="notice notice-err">Couldn't load payments: {error}</p>}
      {state === "ready" && rows.length === 0 && (
        <p>No payments yet. Pay for a NIN update with a succeeding test card and it will appear here.</p>
      )}
      {state === "ready" && rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Receipt</th>
                <th>Citizen</th>
                <th>Service</th>
                <th>Card</th>
                <th className="num">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString("en-NG")}</td>
                  <td className="mono">{r.receipt_number}</td>
                  <td>
                    {r.citizens ? `${r.citizens.first_name} ${r.citizens.last_name}` : "Unknown"}
                    <div className="muted mono">{r.citizens?.nin_masked}</div>
                  </td>
                  <td>{r.service}</td>
                  <td>{r.card_brand} •••• {r.card_last4}</td>
                  <td className="num">{money(r.amount, r.currency)}</td>
                  <td><span className="tag tag-ok">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
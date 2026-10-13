import { useEffect, useState } from "react";
import { createCharge, detectBrand, digitsOnly, luhnValid } from "../lib/mockPaymentApi.js";
import { completeNinPayment } from "../lib/supabase.js";
import { CURRENCY, fullName, money } from "../lib/format.js";

export const SERVICES = [
  { id: "Name correction", price: 1500000, note: "Fix a spelling or order of names" },
  { id: "Date of birth correction", price: 2000000, note: "Requires a supporting birth record" },
  { id: "Gender correction", price: 1500000, note: "Update the gender on the record" },
  { id: "Address update", price: 500000, note: "Change the residential address" },
];

const formatCard = (v) => digitsOnly(v).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const formatExpiry = (v) => {
  const d = digitsOnly(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

function expiryValid(exp) {
  const m = /^(\d{2})\/(\d{2})$/.exec(exp);
  if (!m) return false;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return false;
  return new Date(2000 + Number(m[2]), month, 0, 23, 59, 59) >= new Date();
}

export default function CheckoutForm({ citizen, addLog, fillCard, onComplete }) {
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [form, setForm] = useState({ name: "", email: "", number: "", expiry: "", cvc: "" });
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("idle"); // idle | processing | failed | save_failed
  const [result, setResult] = useState(null);

  const service = SERVICES.find((s) => s.id === serviceId);

  useEffect(() => {
    if (fillCard) {
      setForm((f) => ({
        ...f,
        number: fillCard,
        expiry: f.expiry || "12/30",
        cvc: f.cvc || "123",
        name: f.name || fullName(citizen),
        email: f.email || "test@example.com",
      }));
    }
  }, [fillCard, citizen]);

  const set = (key) => (e) => {
    const v = e.target.value;
    const next =
      key === "number" ? formatCard(v) : key === "expiry" ? formatExpiry(v) : key === "cvc" ? digitsOnly(v).slice(0, 4) : v;
    setForm((f) => ({ ...f, [key]: next }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Enter the name on the card.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (!luhnValid(form.number)) e.number = "That card number isn't valid.";
    if (!expiryValid(form.expiry)) e.expiry = "Use a future date as MM/YY.";
    if (form.cvc.length < 3) e.cvc = "Enter the 3 or 4 digit code.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev) {
    ev.preventDefault();
    if (phase === "processing" || !validate()) return;
    setPhase("processing");
    setResult(null);

    addLog({
      kind: "request",
      title: "POST /v1/charges",
      data: {
        amount: service.price,
        currency: CURRENCY,
        description: `NIN update: ${service.id}`,
        citizen_id: citizen.citizen_id,
        card: { brand: detectBrand(form.number), last4: digitsOnly(form.number).slice(-4), exp: form.expiry, cvc: "•••" },
      },
    });

    const res = await createCharge({
      amount: service.price,
      currency: CURRENCY,
      card: { number: form.number, expiry: form.expiry, cvc: form.cvc },
      customer: { name: form.name, email: form.email },
    });

    addLog({
      kind: res.status === 200 ? "success" : "error",
      title: `${res.status} ${res.status === 200 ? "OK" : res.status === 402 ? "Payment required" : "Bad gateway"}  ·  ${res.elapsed} ms`,
      data: res.body,
    });

    if (res.status !== 200) {
      setPhase("failed");
      setResult({ error: res.body.error });
      return;
    }

    const charge = res.body;
    const { data, error, store } = await completeNinPayment({
      citizen_id: citizen.citizen_id,
      transaction_id: charge.id,
      service: service.id,
      amount: charge.amount,
      currency: charge.currency,
      payer_email: form.email.trim(),
      card_brand: charge.payment_method.brand,
      card_last4: charge.payment_method.last4,
    });

    if (error) {
      addLog({ kind: "error", title: "complete_nin_payment failed", data: { message: error.message, code: error.code } });
      setPhase("save_failed");
      setResult({ transactionId: charge.id, message: error.message });
      return;
    }

    addLog({
      kind: "db",
      title: `Payment saved and NIN updated (${store})`,
      data: { receipt_number: data.receipt_number, citizen_id: citizen.citizen_id, nin_status: "updated" },
    });
    onComplete({ payment: data, citizen: { ...citizen, nin_status: "updated" } });
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2>Choose the update</h2>
      <fieldset className="services">
        <legend className="sr-only">NIN update service</legend>
        {SERVICES.map((s) => (
          <label key={s.id} className={s.id === serviceId ? "service selected" : "service"}>
            <input type="radio" name="service" checked={s.id === serviceId} onChange={() => setServiceId(s.id)} />
            <span>
              <strong>{s.id}</strong>
              <span className="muted"> {s.note}</span>
            </span>
            <span className="price">{money(s.price)}</span>
          </label>
        ))}
      </fieldset>

      <h2>Payment details</h2>
      <div className="field">
        <label htmlFor="name">Name on card</label>
        <input id="name" autoComplete="cc-name" value={form.name} onChange={set("name")} />
        {errors.name && <p className="err">{errors.name}</p>}
      </div>
      <div className="field">
        <label htmlFor="email">Email for receipt</label>
        <input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
        {errors.email && <p className="err">{errors.email}</p>}
      </div>
      <div className="field">
        <label htmlFor="number">Card number</label>
        <input id="number" className="mono" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={form.number} onChange={set("number")} />
        {errors.number && <p className="err">{errors.number}</p>}
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="expiry">Expiry</label>
          <input id="expiry" className="mono" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={form.expiry} onChange={set("expiry")} />
          {errors.expiry && <p className="err">{errors.expiry}</p>}
        </div>
        <div className="field">
          <label htmlFor="cvc">Security code</label>
          <input id="cvc" className="mono" inputMode="numeric" autoComplete="cc-csc" placeholder="123" value={form.cvc} onChange={set("cvc")} />
          {errors.cvc && <p className="err">{errors.cvc}</p>}
        </div>
      </div>

      {phase === "failed" && result?.error && (
        <p className="notice notice-err" role="alert">
          Payment failed. {result.error.message} <span className="mono">({result.error.code})</span> The NIN record was not changed.
        </p>
      )}
      {phase === "save_failed" && (
        <p className="notice notice-warn" role="alert">
          The card was charged (transaction <span className="mono">{result.transactionId}</span>) but the NIN update couldn't be saved: {result.message}. Nothing was written to the database.
        </p>
      )}

      <button className="btn btn-primary" disabled={phase === "processing"}>
        {phase === "processing" ? "Processing…" : `Pay ${money(service.price)}`}
      </button>
    </form>
  );
}
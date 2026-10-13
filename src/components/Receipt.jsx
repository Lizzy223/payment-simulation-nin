import { fullName, money } from "../lib/format.js";

export default function Receipt({ payment, citizen, onNew }) {
  const paidAt = new Date(payment.created_at);
  return (
    <section className="panel receipt" aria-live="polite">
      <div className="success-banner">
        <span className="check" aria-hidden="true">✓</span>
        <div>
          <h2>NIN record updated successfully</h2>
          <p className="muted">
            Payment confirmed. {fullName(citizen)}'s NIN record now shows the “{payment.service}” update.
          </p>
        </div>
      </div>

      <div className="receipt-doc">
        <h3>Payment receipt</h3>
        <p className="receipt-no mono">{payment.receipt_number}</p>
        <dl className="kv">
          <dt>Date</dt>
          <dd>{paidAt.toLocaleString("en-NG")}</dd>
          <dt>Citizen</dt>
          <dd>{fullName(citizen)}</dd>
          <dt>CRN</dt>
          <dd className="mono">{citizen.crn || "—"}</dd>
          <dt>NIN</dt>
          <dd className="mono">{citizen.nin_masked}</dd>
          <dt>Service</dt>
          <dd>{payment.service}</dd>
          <dt>Paid with</dt>
          <dd>{payment.card_brand} ending {payment.card_last4}</dd>
          <dt>Transaction</dt>
          <dd className="mono">{payment.transaction_id}</dd>
          <dt>Receipt sent to</dt>
          <dd>{payment.payer_email}</dd>
        </dl>
        <p className="receipt-total"><span>Amount paid</span><strong>{money(payment.amount, payment.currency)}</strong></p>
        <p className="muted small">Sandbox receipt. No real payment was made.</p>
      </div>

      <div className="actions">
        <button className="btn" onClick={() => window.print()}>Print receipt</button>
        <button className="btn btn-primary inline" onClick={onNew}>Update another NIN</button>
      </div>
    </section>
  );
}
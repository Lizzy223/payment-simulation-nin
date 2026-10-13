/**
 * Simulated payment gateway.
 * Nothing leaves the browser. Card behaviour is decided by the card number,
 * the same way real gateways expose test cards.
 */

export const TEST_CARDS = [
  { number: "4242 4242 4242 4242", label: "Succeeds", outcome: "success" },
  { number: "5555 5555 5555 4444", label: "Succeeds (Mastercard)", outcome: "success" },
  { number: "4000 0000 0000 0002", label: "Card declined", outcome: "card_declined" },
  { number: "4000 0000 0000 9995", label: "Insufficient funds", outcome: "insufficient_funds" },
  { number: "4000 0000 0000 0127", label: "Incorrect CVC", outcome: "incorrect_cvc" },
  { number: "4000 0000 0000 0119", label: "Gateway error", outcome: "processing_error" },
];

const ERRORS = {
  card_declined: { code: "card_declined", message: "The card was declined by the issuer." },
  insufficient_funds: { code: "insufficient_funds", message: "The card has insufficient funds." },
  incorrect_cvc: { code: "incorrect_cvc", message: "The card's security code is incorrect." },
  processing_error: { code: "processing_error", message: "The gateway hit an error. Try again." },
};

const OUTCOME_BY_NUMBER = Object.fromEntries(
  TEST_CARDS.map((c) => [c.number.replace(/\s/g, ""), c.outcome])
);

export const digitsOnly = (v) => v.replace(/\D/g, "");

export function luhnValid(num) {
  const d = digitsOnly(num);
  if (d.length < 12) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function detectBrand(num) {
  const d = digitsOnly(num);
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^(6011|65)/.test(d)) return "Discover";
  return "Card";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 12)}`;

/**
 * POST /v1/charges (simulated)
 * Resolves with { status, body, elapsed }. Declines resolve (like HTTP 402) rather than throw.
 */
export async function createCharge({ amount, currency, card, customer }) {
  const started = performance.now();
  await sleep(900 + Math.random() * 900); // network + processing latency

  const number = digitsOnly(card.number);
  const outcome = OUTCOME_BY_NUMBER[number] || "success";
  const elapsed = Math.round(performance.now() - started);

  if (outcome !== "success") {
    return {
      status: outcome === "processing_error" ? 502 : 402,
      elapsed,
      body: { error: { type: "card_error", ...ERRORS[outcome] } },
    };
  }

  return {
    status: 200,
    elapsed,
    body: {
      id: rid("ch"),
      object: "charge",
      status: "succeeded",
      amount,
      currency,
      receipt_email: customer.email,
      payment_method: {
        brand: detectBrand(number),
        last4: number.slice(-4),
        exp: card.expiry,
      },
      created: Math.floor(Date.now() / 1000),
    },
  };
}

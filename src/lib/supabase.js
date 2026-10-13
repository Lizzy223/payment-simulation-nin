import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key && !url.includes("YOUR-PROJECT"));
export const supabase = isSupabaseConfigured ? createClient(url, key) : null;

/* ---------- localStorage fallback (used when Supabase isn't configured) ---------- */

const CIT_KEY = "payment-sandbox:citizens";
const PAY_KEY = "payment-sandbox:payments";

const SEED = [
  { first_name: "Amaka", last_name: "Okafor", date_of_birth: "1992-03-14", gender: "Female", crn: "CRN-100201", nin_masked: "*******4821" },
  { first_name: "Tunde", last_name: "Bakare", date_of_birth: "1985-11-02", gender: "Male", crn: "CRN-100202", nin_masked: "*******7390" },
  { first_name: "Ngozi", last_name: "Eze", date_of_birth: "2001-07-23", gender: "Female", crn: "CRN-100203", nin_masked: "*******1156" },
  { first_name: "Ibrahim", last_name: "Musa", date_of_birth: "1978-01-30", gender: "Male", crn: "CRN-100204", nin_masked: "*******9027" },
  { first_name: "Chidi", last_name: "Nwosu", date_of_birth: "1969-05-09", gender: "Male", crn: "CRN-100205", nin_masked: "*******3348", is_deceased: true },
].map((c) => ({
  citizen_id: crypto.randomUUID(),
  temporary_birth_id: null,
  is_deceased: false,
  nin_status: "pending",
  nin_update_service: null,
  nin_updated_at: null,
  ...c,
}));

const read = (k, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function localCitizens() {
  let list = read(CIT_KEY, null);
  if (!list) {
    list = SEED;
    write(CIT_KEY, list);
  }
  return list;
}

/* ---------- Public API ---------- */

export async function searchCitizens(term) {
  const q = term.trim().replace(/[,()%*]/g, " ").trim();
  if (q.length < 2) return { data: [], error: null };

  if (!supabase) {
    const needle = q.toLowerCase();
    const data = localCitizens().filter((c) =>
      [c.first_name, c.last_name, c.crn, c.nin_masked].some((v) => v && v.toLowerCase().includes(needle))
    );
    return { data: data.slice(0, 10), error: null };
  }

  const { data, error } = await supabase
    .from("citizens")
    .select("citizen_id, first_name, last_name, date_of_birth, gender, crn, nin_masked, is_deceased, nin_status, nin_update_service, nin_updated_at")
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,crn.ilike.%${q}%,nin_masked.ilike.%${q}%`)
    .order("last_name")
    .limit(10);
  return { data: data || [], error };
}

/**
 * Records the successful payment and marks the citizen's NIN as updated.
 * On Supabase this is one atomic database function call.
 */
export async function completeNinPayment(p) {
  if (!supabase) {
    const citizens = localCitizens();
    const idx = citizens.findIndex((c) => c.citizen_id === p.citizen_id);
    if (idx === -1 || citizens[idx].is_deceased) {
      return { data: null, error: { message: "Citizen not found or marked deceased" }, store: "localStorage" };
    }
    const payment = {
      id: crypto.randomUUID(),
      receipt_number: `RCT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      transaction_id: p.transaction_id,
      citizen_id: p.citizen_id,
      service: p.service,
      amount: p.amount,
      currency: p.currency,
      payer_email: p.payer_email,
      card_brand: p.card_brand,
      card_last4: p.card_last4,
      status: "succeeded",
      created_at: new Date().toISOString(),
    };
    citizens[idx] = { ...citizens[idx], nin_status: "updated", nin_update_service: p.service, nin_updated_at: payment.created_at };
    write(CIT_KEY, citizens);
    write(PAY_KEY, [payment, ...read(PAY_KEY, [])]);
    return { data: payment, error: null, store: "localStorage" };
  }

  const { data, error } = await supabase.rpc("complete_nin_payment", {
    p_citizen_id: p.citizen_id,
    p_transaction_id: p.transaction_id,
    p_service: p.service,
    p_amount: p.amount,
    p_currency: p.currency,
    p_payer_email: p.payer_email,
    p_card_brand: p.card_brand,
    p_card_last4: p.card_last4,
  });
  return { data, error, store: "supabase" };
}

export async function listPayments() {
  if (!supabase) {
    const citizens = localCitizens();
    const data = read(PAY_KEY, []).map((r) => ({
      ...r,
      citizens: citizens.find((c) => c.citizen_id === r.citizen_id) || null,
    }));
    return { data, error: null };
  }
  const { data, error } = await supabase
    .from("payments")
    .select("*, citizens(first_name, last_name, nin_masked, crn)")
    .order("created_at", { ascending: false })
    .limit(50);
  return { data: data || [], error };
}
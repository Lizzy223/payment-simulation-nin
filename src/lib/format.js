export const CURRENCY = "NGN";

export const money = (minor, currency = CURRENCY) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(minor / 100);

export const fullName = (c) => `${c.first_name} ${c.last_name}`;
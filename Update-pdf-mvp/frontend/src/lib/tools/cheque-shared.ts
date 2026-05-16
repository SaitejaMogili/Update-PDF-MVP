// Client-safe utilities — no server-only imports.
// Server-side PDF generation lives in cheque.ts.

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function toWords(n: number): string {
  if (n === 0) return "Zero";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  if (n < 1000)
    return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + toWords(n % 100) : "");
  if (n < 1_000_000)
    return toWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + toWords(n % 1000) : "");
  return toWords(Math.floor(n / 1_000_000)) + " Million" + (n % 1_000_000 ? " " + toWords(n % 1_000_000) : "");
}

/** Convert amount in cents to English words, e.g. 125050 → "One Thousand Two Hundred Fifty and 50/100" */
export function amountToWords(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const centsRemainder = cents % 100;
  return toWords(dollars) + ` and ${String(centsRemainder).padStart(2, "0")}/100`;
}

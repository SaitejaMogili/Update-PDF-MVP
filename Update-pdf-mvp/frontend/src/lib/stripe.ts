import "server-only";
import Stripe from "stripe";

// Lazy init so Next.js build succeeds without the env var present at compile time
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    _stripe = new Stripe(key, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// Proxy keeps all call-sites unchanged (stripe.customers.retrieve etc.)
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop: string | symbol) {
    return getStripe()[prop as keyof Stripe];
  },
});

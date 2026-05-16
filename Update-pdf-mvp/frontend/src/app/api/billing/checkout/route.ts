import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import { PLANS, type PlanKey } from "@/lib/config/pricing";

const bodySchema = z.object({
  plan: z.enum(["pro", "business"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const { plan } = parsed.data;
  const planConfig = PLANS[plan as PlanKey];
  if (!planConfig.priceId) return NextResponse.json({ error: "Plan not configured" }, { status: 500 });

  const service = createServiceClient();

  // Retrieve existing Stripe customer ID if any
  const { data: existingSub } = await service
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  // If they already have an active subscription, send to portal instead
  if (existingSub?.stripe_subscription_id && existingSub.status === "active") {
    const portal = await stripe.billingPortal.sessions.create({
      customer: existingSub.stripe_customer_id!,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings`,
    });
    return NextResponse.json({ url: portal.url });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    ...(existingSub?.stripe_customer_id
      ? { customer: existingSub.stripe_customer_id }
      : { customer_email: user.email ?? undefined }),
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan },
    subscription_data: { metadata: { user_id: user.id, plan } },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings?billing=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}

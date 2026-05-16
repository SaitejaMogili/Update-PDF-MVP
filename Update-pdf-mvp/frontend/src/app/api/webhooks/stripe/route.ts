import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { PLANS, type PlanKey } from "@/lib/config/pricing";

export const dynamic = "force-dynamic";

// Raw body needed for Stripe signature verification — do NOT call request.json()
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const service = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, service);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, service);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, service);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice, service);
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook]", event.type, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  service: ReturnType<typeof createServiceClient>
) {
  const userId = session.client_reference_id;
  const plan = session.metadata?.plan as PlanKey | undefined;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId || !plan || !PLANS[plan]) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  // In Stripe v22+, period_end lives on the first subscription item
  const rawPeriodEnd = subscription.items?.data?.[0]?.current_period_end;
  const periodEnd = rawPeriodEnd
    ? new Date(rawPeriodEnd * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await service.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      status: subscription.status,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      seats: 1,
    },
    { onConflict: "user_id" }
  );

  await service.from("profiles")
    .update({ plan, credits_refresh_at: periodEnd })
    .eq("id", userId);

  // Credit the user's monthly allowance
  await service.rpc("refund_credits", {
    p_user_id: userId,
    p_amount: PLANS[plan].credits,
    p_reason: `subscription_start_${plan}`,
    p_reference_id: undefined,
  });
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  service: ReturnType<typeof createServiceClient>
) {
  const userId = subscription.metadata?.user_id;
  const plan = (subscription.metadata?.plan ?? "pro") as PlanKey;
  if (!userId) return;

  // In Stripe v22+, period_end lives on the first subscription item
  const rawPeriodEnd2 = subscription.items?.data?.[0]?.current_period_end;
  const periodEnd = rawPeriodEnd2
    ? new Date(rawPeriodEnd2 * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await service.from("subscriptions").update({
    plan,
    status: subscription.status,
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }).eq("stripe_subscription_id", subscription.id);

  // Sync plan on profiles
  if (subscription.status === "active") {
    await service.from("profiles").update({ plan }).eq("id", userId);
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  service: ReturnType<typeof createServiceClient>
) {
  await service.from("subscriptions").update({
    status: "canceled",
    cancel_at_period_end: false,
  }).eq("stripe_subscription_id", subscription.id);

  const userId = subscription.metadata?.user_id;
  if (userId) {
    await service.from("profiles").update({ plan: "free" }).eq("id", userId);
  }
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  service: ReturnType<typeof createServiceClient>
) {
  // Only credit on subscription renewals, not the initial payment (handled in checkout.session.completed)
  const isRenewal = invoice.billing_reason === "subscription_cycle";
  if (!isRenewal) return;

  const customerId = invoice.customer as string;
  const { data: sub } = await service
    .from("subscriptions")
    .select("user_id, plan")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!sub?.user_id || !sub.plan || !PLANS[sub.plan as PlanKey]) return;

  const plan = sub.plan as PlanKey;
  const credits = PLANS[plan].credits;

  // Get the new period end from the subscription (v22: invoice.parent.subscription_details.subscription)
  const stripeSubId = (
    invoice.parent?.subscription_details?.subscription as string | undefined
  ) ?? undefined;
  let periodEnd: string | undefined;
  if (stripeSubId) {
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
    const rawEnd = stripeSub.items?.data?.[0]?.current_period_end;
    periodEnd = rawEnd ? new Date(rawEnd * 1000).toISOString() : undefined;
  }

  // Reset credit balance to the plan allowance and update refresh date
  await service.from("profiles")
    .update({
      credits_balance: credits,
      ...(periodEnd ? { credits_refresh_at: periodEnd } : {}),
    })
    .eq("id", sub.user_id);

  // Append to ledger (use a large positive delta to represent the reset)
  await service.rpc("refund_credits", {
    p_user_id: sub.user_id,
    p_amount: credits,
    p_reason: `subscription_renewal_${plan}`,
    p_reference_id: undefined,
  });
}

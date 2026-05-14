import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

interface DebitResult {
  ok: boolean;
  balance: number;
  error?: string;
}

export async function debitCredits(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<DebitResult> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("debit_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_reference_id: referenceId,
  });

  if (error) return { ok: false, balance: 0, error: error.message };

  const result = data as { ok: boolean; balance: number; error?: string };
  return result;
}

export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<void> {
  const supabase = createServiceClient();

  await supabase.rpc("refund_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_reference_id: referenceId,
  });
}

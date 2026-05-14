-- ============================================================
-- 0005_storage_and_credits.sql
-- Storage buckets + atomic credit RPC functions
-- ============================================================

-- ── Storage buckets ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('uploads', 'uploads', false, 52428800,  array['application/pdf']),
  ('outputs', 'outputs', false, 104857600, null)
on conflict (id) do nothing;

-- uploads: authenticated users can manage files in their own folder
create policy "users upload own files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users read own uploads"
  on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own uploads"
  on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- outputs: read-only for users (service role writes)
create policy "users read own outputs"
  on storage.objects for select to authenticated
  using (bucket_id = 'outputs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Atomic credit functions ──────────────────────────────────
-- These run in a single transaction with FOR UPDATE so concurrent
-- requests can't double-spend the same credits.

create or replace function debit_credits(
  p_user_id     uuid,
  p_amount      int,
  p_reason      text,
  p_reference_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_balance     int;
  v_new_balance int;
begin
  select credits_balance into v_balance
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if v_balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'balance', v_balance);
  end if;

  v_new_balance := v_balance - p_amount;

  update public.profiles
  set credits_balance = v_new_balance
  where id = p_user_id;

  insert into public.credit_ledger (user_id, delta, reason, reference_id, balance_after)
  values (p_user_id, -p_amount, p_reason, p_reference_id, v_new_balance);

  return jsonb_build_object('ok', true, 'balance', v_new_balance);
end;
$$;

create or replace function refund_credits(
  p_user_id      uuid,
  p_amount       int,
  p_reason       text,
  p_reference_id uuid default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_balance     int;
  v_new_balance int;
begin
  select credits_balance into v_balance
  from public.profiles
  where id = p_user_id
  for update;

  if not found then return; end if;

  v_new_balance := v_balance + p_amount;

  update public.profiles
  set credits_balance = v_new_balance
  where id = p_user_id;

  insert into public.credit_ledger (user_id, delta, reason, reference_id, balance_after)
  values (p_user_id, p_amount, p_reason, p_reference_id, v_new_balance);
end;
$$;

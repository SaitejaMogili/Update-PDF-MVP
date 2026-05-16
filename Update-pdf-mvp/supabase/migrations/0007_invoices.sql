-- ============================================================
-- 0007_invoices.sql
-- Invoice history + drafts table
-- ============================================================

create table invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'generated')),
  invoice_number text not null,
  invoice_date date not null,
  due_date date,
  from_name text not null,
  from_address text,
  from_email text,
  from_phone text,
  to_name text not null,
  to_address text,
  to_email text,
  line_items jsonb not null default '[]',
  tax_rate_bps int not null default 0,
  notes text,
  currency text not null default 'USD',
  logo_base64 text,         -- raw base64 of logo image (no data URL prefix)
  logo_mime_type text,      -- 'image/png' or 'image/jpeg'
  subtotal_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  total_cents bigint not null default 0,
  output_file_id uuid references files(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on invoices (user_id, created_at desc);

alter table invoices enable row level security;

create policy "users crud own invoices"
  on invoices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

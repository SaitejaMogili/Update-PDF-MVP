-- ============================================================
-- 0001_init.sql
-- UpdatePDF core schema (12 tables + 2 extensions)
-- ============================================================

create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- profiles: user accounts, plan, credit balance
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free','pro','business')),
  credits_balance int not null default 100,
  credits_refresh_at timestamptz not null default (now() + interval '1 month'),
  fingerprint text,
  referrer text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- subscriptions: Stripe subscription state
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  seats int not null default 1,
  created_at timestamptz default now()
);

-- credit_ledger: append-only audit of credit changes
create table credit_ledger (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  delta int not null,
  reason text not null,
  reference_id uuid,
  balance_after int not null,
  created_at timestamptz default now()
);
create index on credit_ledger (user_id, created_at desc);

-- files: uploaded user files with 1-hour TTL
create table files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  anon_fingerprint text,
  storage_path text not null,
  filename text not null,
  size_bytes bigint,
  mime_type text,
  page_count int,
  expires_at timestamptz default (now() + interval '1 hour'),
  created_at timestamptz default now()
);
create index on files (expires_at);

-- tool_jobs: every tool execution
create table tool_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  anon_fingerprint text,
  tool_slug text not null,
  input_file_ids uuid[],
  output_file_id uuid references files(id),
  status text not null default 'queued',
  params jsonb,
  credits_charged int default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);
create index on tool_jobs (user_id, created_at desc);
create index on tool_jobs (status) where status in ('queued','running');

-- chat_sessions: chat-with-pdf conversations
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  file_ids uuid[] not null,
  title text,
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now(),
  last_message_at timestamptz default now()
);

-- chat_messages: individual messages within a session
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb,
  tokens int,
  created_at timestamptz default now()
);

-- chat_embeddings: pgvector indexes for RAG
create table chat_embeddings (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references files(id) on delete cascade,
  chunk_index int not null,
  page_number int,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);
create index on chat_embeddings using hnsw (embedding vector_cosine_ops);

-- signatures: saved signature images for cheques and signing
create table signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  label text,
  storage_path text not null,
  created_at timestamptz default now()
);

-- cheques: cheque print audit trail
create table cheques (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  cheque_number text,
  payee text not null,
  amount_cents bigint not null,
  currency text not null default 'USD',
  memo text,
  bank_template text,
  signature_id uuid references signatures(id),
  output_file_id uuid references files(id),
  status text default 'printed' check (status in ('printed','voided')),
  printed_at timestamptz default now(),
  created_at timestamptz default now()
);
create index on cheques (user_id, printed_at desc);

-- api_keys: Business-plan API access keys
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  key_hash text not null,
  key_prefix text not null,
  label text,
  last_used_at timestamptz,
  created_at timestamptz default now(),
  revoked_at timestamptz
);

-- audit_logs: Business-plan audit trail
create table audit_logs (
  id bigserial primary key,
  user_id uuid references profiles(id),
  team_id uuid,
  action text not null,
  resource_type text,
  resource_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz default now()
);

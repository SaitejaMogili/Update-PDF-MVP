-- ============================================================
-- 0002_rls.sql
-- Row Level Security policies for all 12 core tables
-- Every table scoped by auth.uid() so users see only their data
-- ============================================================

-- Enable RLS on every table
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table credit_ledger enable row level security;
alter table files enable row level security;
alter table tool_jobs enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table chat_embeddings enable row level security;
alter table signatures enable row level security;
alter table cheques enable row level security;
alter table api_keys enable row level security;
alter table audit_logs enable row level security;

-- ============================================================
-- profiles
-- ============================================================
create policy "users read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "users update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- subscriptions (read-only for users, service role writes)
-- ============================================================
create policy "users read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- ============================================================
-- credit_ledger (APPEND-ONLY by design — no UPDATE/DELETE)
-- ============================================================
create policy "users read own ledger"
  on credit_ledger for select
  using (auth.uid() = user_id);

create policy "users append to own ledger"
  on credit_ledger for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- files
-- ============================================================
create policy "users read own files"
  on files for select
  using (auth.uid() = user_id);

create policy "users insert own files"
  on files for insert
  with check (auth.uid() = user_id);

create policy "users delete own files"
  on files for delete
  using (auth.uid() = user_id);

-- ============================================================
-- tool_jobs
-- ============================================================
create policy "users read own jobs"
  on tool_jobs for select
  using (auth.uid() = user_id);

create policy "users insert own jobs"
  on tool_jobs for insert
  with check (auth.uid() = user_id);

create policy "users update own jobs"
  on tool_jobs for update
  using (auth.uid() = user_id);

-- ============================================================
-- chat_sessions
-- ============================================================
create policy "users read own chat sessions"
  on chat_sessions for select
  using (auth.uid() = user_id);

create policy "users insert own chat sessions"
  on chat_sessions for insert
  with check (auth.uid() = user_id);

create policy "users update own chat sessions"
  on chat_sessions for update
  using (auth.uid() = user_id);

create policy "users delete own chat sessions"
  on chat_sessions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- chat_messages (scoped via parent session)
-- ============================================================
create policy "users read messages in own sessions"
  on chat_messages for select
  using (
    session_id in (
      select id from chat_sessions where user_id = auth.uid()
    )
  );

create policy "users insert messages in own sessions"
  on chat_messages for insert
  with check (
    session_id in (
      select id from chat_sessions where user_id = auth.uid()
    )
  );

-- ============================================================
-- chat_embeddings (scoped via parent file)
-- ============================================================
create policy "users read embeddings for own files"
  on chat_embeddings for select
  using (
    file_id in (
      select id from files where user_id = auth.uid()
    )
  );

-- ============================================================
-- signatures
-- ============================================================
create policy "users read own signatures"
  on signatures for select
  using (auth.uid() = user_id);

create policy "users insert own signatures"
  on signatures for insert
  with check (auth.uid() = user_id);

create policy "users delete own signatures"
  on signatures for delete
  using (auth.uid() = user_id);

-- ============================================================
-- cheques
-- ============================================================
create policy "users read own cheques"
  on cheques for select
  using (auth.uid() = user_id);

create policy "users insert own cheques"
  on cheques for insert
  with check (auth.uid() = user_id);

create policy "users update own cheques"
  on cheques for update
  using (auth.uid() = user_id);

-- ============================================================
-- api_keys (read for users, writes via service role only)
-- ============================================================
create policy "users read own api keys"
  on api_keys for select
  using (auth.uid() = user_id);

-- ============================================================
-- audit_logs (read-only for users, service role writes)
-- ============================================================
create policy "users read own audit logs"
  on audit_logs for select
  using (auth.uid() = user_id);

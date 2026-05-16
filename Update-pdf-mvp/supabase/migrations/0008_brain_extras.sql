-- brain_documents: tracks each PDF added to a workspace
create table brain_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references brain_workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  file_id uuid references files(id) on delete set null,
  filename text not null,
  page_count int,
  chunk_count int default 0,
  status text not null default 'pending' check (status in ('pending','ingesting','ready','failed')),
  error_message text,
  created_at timestamptz default now()
);
create index on brain_documents (workspace_id, created_at desc);
alter table brain_documents enable row level security;
create policy "users crud own brain docs" on brain_documents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- brain_sessions: chat sessions within a workspace
create table brain_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references brain_workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  agent_name text not null default 'General',
  created_at timestamptz default now(),
  last_message_at timestamptz default now()
);
create index on brain_sessions (workspace_id, last_message_at desc);
alter table brain_sessions enable row level security;
create policy "users crud own brain sessions" on brain_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- brain_messages: messages within a brain session
create table brain_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references brain_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb default '[]',
  created_at timestamptz default now()
);
create index on brain_messages (session_id, created_at asc);
alter table brain_messages enable row level security;
create policy "users access own brain messages" on brain_messages for all
  using (
    exists (
      select 1 from brain_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from brain_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- RPC: search across multiple files in a brain workspace
create or replace function match_brain_embeddings(
  query_embedding vector(1536),
  match_file_ids uuid[],
  match_count int default 8
)
returns table (
  file_id uuid,
  filename text,
  content text,
  page_number int,
  similarity float
)
language sql stable security definer
as $$
  select
    ce.file_id,
    f.filename,
    ce.content,
    ce.page_number,
    1 - (ce.embedding <=> query_embedding) as similarity
  from chat_embeddings ce
  join files f on f.id = ce.file_id
  where ce.file_id = any(match_file_ids)
  order by ce.embedding <=> query_embedding
  limit match_count;
$$;

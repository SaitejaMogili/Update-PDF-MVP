-- ============================================================
-- 0003_templates_brain.sql
-- Addendum: Document Studio templates + Document Brain tables
-- Adds 6 new tables + their RLS policies
-- ============================================================

-- ============================================================
-- template_categories: Business/HR/Finance/etc.
-- ============================================================
create table template_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  icon text,
  display_order int default 0,
  template_count int default 0,
  created_at timestamptz default now()
);

insert into template_categories (slug, name, display_order) values
  ('business', 'Business', 1),
  ('hr', 'HR & Recruitment', 2),
  ('finance', 'Finance', 3),
  ('productivity', 'Productivity', 4),
  ('education', 'Education', 5),
  ('personal', 'Personal', 6);

-- ============================================================
-- templates: catalog of all available templates
-- ============================================================
create table templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references template_categories(id),
  slug text unique not null,
  name text not null,
  description text,
  preview_url text,
  layout_json jsonb not null,
  fields_json jsonb not null,
  default_credits int default 1,
  tier text default 'free' check (tier in ('free', 'pro', 'business')),
  is_ai_assisted boolean default false,
  is_published boolean default true,
  popularity_score int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on templates (category_id);
create index on templates (slug);
create index on templates (is_published);

-- ============================================================
-- template_instances: user's saved drafts/copies of templates
-- ============================================================
create table template_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  template_id uuid references templates(id),
  brand_kit_id uuid,
  name text,
  values_json jsonb not null,
  output_file_id uuid references files(id),
  is_ai_generated boolean default false,
  ai_prompt text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on template_instances (user_id, updated_at desc);

-- ============================================================
-- brand_kits: user logos/colors/fonts for branded rendering
-- ============================================================
create table brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  team_id uuid,
  name text not null,
  is_default boolean default false,
  logo_file_id uuid references files(id),
  primary_color text,
  secondary_color text,
  font_family text,
  company_name text,
  company_address text,
  company_email text,
  company_phone text,
  tax_id text,
  created_at timestamptz default now()
);
create index on brand_kits (user_id);

-- ============================================================
-- brain_workspaces: Document Brain workspaces
-- ============================================================
create table brain_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  team_id uuid,
  name text not null default 'My Brain',
  description text,
  file_ids uuid[] default '{}',
  agent_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on brain_workspaces (user_id);

-- ============================================================
-- brain_agents: custom AI agents (Legal, HR, Finance, Custom)
-- ============================================================
create table brain_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  name text not null,
  system_prompt text not null,
  is_system boolean default false,
  created_at timestamptz default now()
);

-- Seed system agents (available to all users)
insert into brain_agents (name, system_prompt, is_system) values
  ('Legal', 'You are a legal analyst. Review documents for clauses, risks, and asymmetric obligations. Always cite the source file and page.', true),
  ('HR', 'You analyze HR documents like policies, contracts, and job descriptions. Look for compliance issues and clarity. Cite sources.', true),
  ('Finance', 'You review financial documents including invoices, statements, and contracts. Flag inconsistencies and missing required fields. Cite sources.', true),
  ('General', 'You answer questions about the documents in this workspace. Be concise and always cite the file and page you draw information from.', true);

-- ============================================================
-- Now add the deferred foreign keys (template_instances → brand_kits)
-- ============================================================
alter table template_instances
  add constraint template_instances_brand_kit_fk
  foreign key (brand_kit_id) references brand_kits(id) on delete set null;

alter table brain_workspaces
  add constraint brain_workspaces_agent_fk
  foreign key (agent_id) references brain_agents(id) on delete set null;

-- ============================================================
-- RLS for all 6 new tables
-- ============================================================
alter table template_categories enable row level security;
alter table templates enable row level security;
alter table template_instances enable row level security;
alter table brand_kits enable row level security;
alter table brain_workspaces enable row level security;
alter table brain_agents enable row level security;

-- template_categories: public read
create policy "public read template categories"
  on template_categories for select
  using (true);

-- templates: public read for published
create policy "public read published templates"
  on templates for select
  using (is_published = true);

-- template_instances: user-scoped
create policy "users read own template instances"
  on template_instances for select
  using (auth.uid() = user_id);

create policy "users insert own template instances"
  on template_instances for insert
  with check (auth.uid() = user_id);

create policy "users update own template instances"
  on template_instances for update
  using (auth.uid() = user_id);

create policy "users delete own template instances"
  on template_instances for delete
  using (auth.uid() = user_id);

-- brand_kits: user-scoped
create policy "users read own brand kits"
  on brand_kits for select
  using (auth.uid() = user_id);

create policy "users insert own brand kits"
  on brand_kits for insert
  with check (auth.uid() = user_id);

create policy "users update own brand kits"
  on brand_kits for update
  using (auth.uid() = user_id);

create policy "users delete own brand kits"
  on brand_kits for delete
  using (auth.uid() = user_id);

-- brain_workspaces: user-scoped
create policy "users read own brain workspaces"
  on brain_workspaces for select
  using (auth.uid() = user_id);

create policy "users insert own brain workspaces"
  on brain_workspaces for insert
  with check (auth.uid() = user_id);

create policy "users update own brain workspaces"
  on brain_workspaces for update
  using (auth.uid() = user_id);

create policy "users delete own brain workspaces"
  on brain_workspaces for delete
  using (auth.uid() = user_id);

-- brain_agents: read system agents + read own custom agents
create policy "users read system or own agents"
  on brain_agents for select
  using (is_system = true or auth.uid() = user_id);

create policy "users insert own agents"
  on brain_agents for insert
  with check (auth.uid() = user_id and is_system = false);

create policy "users update own agents"
  on brain_agents for update
  using (auth.uid() = user_id and is_system = false);

create policy "users delete own agents"
  on brain_agents for delete
  using (auth.uid() = user_id and is_system = false);

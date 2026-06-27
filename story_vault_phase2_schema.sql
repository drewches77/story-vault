-- ============================================================
-- Story Vault Phase 2 Schema
-- Run this in Supabase SQL editor
-- Safe to run on existing database — does not modify existing tables
-- ============================================================


-- ------------------------------------------------------------
-- 1. story_scores
-- Expanded scoring without touching existing stories table
-- ------------------------------------------------------------
create table story_scores (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade,
  clarity_score integer check (clarity_score between 1 and 5),
  emotional_impact_score integer check (emotional_impact_score between 1 and 5),
  teaching_value_score integer check (teaching_value_score between 1 and 5),
  authority_value_score integer check (authority_value_score between 1 and 5),
  sales_value_score integer check (sales_value_score between 1 and 5),
  relatability_score integer check (relatability_score between 1 and 5),
  reusability_score integer check (reusability_score between 1 and 5),
  overall_utility_score numeric generated always as (
    (
      coalesce(clarity_score, 0) +
      coalesce(emotional_impact_score, 0) +
      coalesce(teaching_value_score, 0) +
      coalesce(authority_value_score, 0) +
      coalesce(sales_value_score, 0) +
      coalesce(relatability_score, 0) +
      coalesce(reusability_score, 0)
    )::numeric /
    nullif((
      (clarity_score is not null)::int +
      (emotional_impact_score is not null)::int +
      (teaching_value_score is not null)::int +
      (authority_value_score is not null)::int +
      (sales_value_score is not null)::int +
      (relatability_score is not null)::int +
      (reusability_score is not null)::int
    ), 0)
  ) stored,
  analysis_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_story_scores_story on story_scores(story_id);


-- ------------------------------------------------------------
-- 2. story_secondary_types
-- Allow one story to serve multiple strategic roles
-- ------------------------------------------------------------
create table story_secondary_types (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade,
  story_type text not null,
  created_at timestamptz default now()
);

create index idx_story_secondary_types_story on story_secondary_types(story_id);


-- ------------------------------------------------------------
-- 3. frameworks
-- Client and Authority Forge frameworks
-- ------------------------------------------------------------
create table frameworks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  description text,
  framework_type text check (framework_type in (
    'authority', 'client_ip', 'talk_framework', 'webinar_framework',
    'sales_framework', 'content_framework', 'offer_framework', 'other'
  )),
  steps jsonb,
  best_use_cases text[],
  related_topics text[],
  visual_metaphor text,
  status text default 'draft' check (status in ('draft', 'reviewed', 'approved', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_frameworks_client on frameworks(client_id);


-- ------------------------------------------------------------
-- 4. framework_stories
-- Connect stories to frameworks (and specific steps)
-- ------------------------------------------------------------
create table framework_stories (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid references frameworks(id) on delete cascade,
  story_id uuid references stories(id) on delete cascade,
  framework_step text,
  notes text,
  created_at timestamptz default now()
);

create index idx_framework_stories_framework on framework_stories(framework_id);
create index idx_framework_stories_story on framework_stories(story_id);


-- ------------------------------------------------------------
-- 5. offers
-- Client offers that projects and strategies point toward
-- ------------------------------------------------------------
create table offers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  description text,
  price text,
  audience text,
  problem_solved text,
  promise text,
  cta text,
  status text default 'active' check (status in ('active', 'draft', 'archived')),
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_offers_client on offers(client_id);


-- ------------------------------------------------------------
-- 6. projects
-- Talk, webinar, sales presentation, email campaign projects
-- ------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  vault_id uuid references story_vaults(id) on delete set null,
  project_type text not null check (project_type in (
    'talk', 'webinar', 'sales_presentation', 'email_campaign'
  )),
  title text not null,
  status text default 'draft' check (status in (
    'draft', 'in_progress', 'ready_for_review', 'approved', 'archived'
  )),
  audience text,
  goal text,
  cta text,
  offer_id uuid references offers(id) on delete set null,
  primary_framework_id uuid references frameworks(id) on delete set null,
  length_minutes integer,
  tone text,
  setup_data jsonb,
  readiness_score numeric,
  readiness_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_projects_client on projects(client_id);
create index idx_projects_vault on projects(vault_id);


-- ------------------------------------------------------------
-- 7. project_stories
-- Stories selected and assigned a role within a project
-- ------------------------------------------------------------
create table project_stories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  story_id uuid references stories(id) on delete cascade,
  story_role text check (story_role in (
    'opening_story', 'origin_story', 'credibility_story', 'failure_story',
    'teaching_story', 'proof_story', 'objection_story', 'transition_story',
    'closing_story', 'cta_story', 'email_story', 'social_story'
  )),
  notes text,
  created_at timestamptz default now()
);

create index idx_project_stories_project on project_stories(project_id);
create index idx_project_stories_story on project_stories(story_id);


-- ------------------------------------------------------------
-- 8. generated_assets
-- All AI-generated outputs in one flexible table
-- ------------------------------------------------------------
create table generated_assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  vault_id uuid references story_vaults(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  asset_type text not null check (asset_type in (
    'social_strategy', 'talk_outline', 'webinar_outline',
    'sales_presentation_outline', 'email_campaign_plan',
    'story_analysis', 'readiness_report', 'content_ideas',
    'cta_map', 'project_recommendations'
  )),
  title text,
  content jsonb not null,
  plain_text text,
  input_snapshot jsonb,
  model_used text,
  prompt_version text,
  status text default 'draft' check (status in ('draft', 'reviewed', 'approved', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_generated_assets_client on generated_assets(client_id);
create index idx_generated_assets_project on generated_assets(project_id);
create index idx_generated_assets_type on generated_assets(asset_type);


-- ------------------------------------------------------------
-- 9. generated_asset_versions
-- Version history for all generated assets
-- ------------------------------------------------------------
create table generated_asset_versions (
  id uuid primary key default gen_random_uuid(),
  generated_asset_id uuid references generated_assets(id) on delete cascade,
  version_number integer not null,
  content jsonb not null,
  plain_text text,
  change_note text,
  created_at timestamptz default now()
);

create index idx_generated_asset_versions_asset on generated_asset_versions(generated_asset_id);


-- ============================================================
-- RLS Policies
-- Open access for now (internal-only, no auth yet).
-- Replace using (true) with auth-based conditions when
-- client-facing access is added.
-- ============================================================

alter table story_scores enable row level security;
alter table story_secondary_types enable row level security;
alter table frameworks enable row level security;
alter table framework_stories enable row level security;
alter table offers enable row level security;
alter table projects enable row level security;
alter table project_stories enable row level security;
alter table generated_assets enable row level security;
alter table generated_asset_versions enable row level security;

create policy "Allow all on story_scores" on story_scores for all using (true) with check (true);
create policy "Allow all on story_secondary_types" on story_secondary_types for all using (true) with check (true);
create policy "Allow all on frameworks" on frameworks for all using (true) with check (true);
create policy "Allow all on framework_stories" on framework_stories for all using (true) with check (true);
create policy "Allow all on offers" on offers for all using (true) with check (true);
create policy "Allow all on projects" on projects for all using (true) with check (true);
create policy "Allow all on project_stories" on project_stories for all using (true) with check (true);
create policy "Allow all on generated_assets" on generated_assets for all using (true) with check (true);
create policy "Allow all on generated_asset_versions" on generated_asset_versions for all using (true) with check (true);

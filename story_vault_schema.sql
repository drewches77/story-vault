-- Clients table
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  notes text,
  created_at timestamptz default now()
);

-- Story Vaults table (one client can have multiple vaults)
create table story_vaults (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  status text default 'active',
  created_at timestamptz default now()
);

-- Stories table
create table stories (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid references story_vaults(id) on delete cascade,
  title text not null,
  content text,
  category text,
  source text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Tags table
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- Join table for many-to-many stories <-> tags
create table story_tags (
  story_id uuid references stories(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (story_id, tag_id)
);

-- Helpful indexes
create index idx_story_vaults_client on story_vaults(client_id);
create index idx_stories_vault on stories(vault_id);
create index idx_story_tags_story on story_tags(story_id);
create index idx_story_tags_tag on story_tags(tag_id);

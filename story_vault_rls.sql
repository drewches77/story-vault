-- Enable RLS on all tables
alter table clients enable row level security;
alter table story_vaults enable row level security;
alter table stories enable row level security;
alter table tags enable row level security;
alter table story_tags enable row level security;

-- For now (solo proof-of-concept, no login yet), allow full access.
-- We'll tighten these with auth-based policies once you add users/clients.
create policy "Allow all on clients" on clients for all using (true) with check (true);
create policy "Allow all on story_vaults" on story_vaults for all using (true) with check (true);
create policy "Allow all on stories" on stories for all using (true) with check (true);
create policy "Allow all on tags" on tags for all using (true) with check (true);
create policy "Allow all on story_tags" on story_tags for all using (true) with check (true);

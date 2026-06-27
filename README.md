# Story Vault

A simple app to manage client Story Vaults — stories organized by client, vault, category, and tags.

## Setup

1. Run the SQL files in this repo against your Supabase project:
   - `story_vault_schema.sql` (tables)
   - `story_vault_rls.sql` (access policies)

2. Copy `.env.local.example` to `.env.local` and fill in your Supabase URL and publishable key.

3. Install and run:
   ```
   npm install
   npm run dev
   ```

## Deploy

Push this repo to GitHub, then import it in Vercel. Add the same environment variables
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.

## Structure

- `/` — list of clients
- `/clients/[clientId]` — story vaults for a client
- `/clients/[clientId]/vaults/[vaultId]` — stories within a vault, with categories and tags

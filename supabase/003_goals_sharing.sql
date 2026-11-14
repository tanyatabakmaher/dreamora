-- Applied to the Supabase project as migration "goals_add_visibility_members"
-- Phase 1 only stores these fields; nothing in the UI sets a goal to shared yet.
alter table public.goals
  add column visibility text not null default 'private' check (visibility in ('private','shared')),
  add column members jsonb not null default '[]'::jsonb check (jsonb_typeof(members) = 'array' and jsonb_array_length(members) <= 20);

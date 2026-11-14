-- Applied to the Supabase project as migration "notifications_table_and_goal_milestone"
-- Types: milestone (25/50/75) and achieved (100) are produced by the app. shareRequest is reserved for the sharing phase (not produced yet).
alter table public.goals
  add column notified_milestone_pct smallint check (notified_milestone_pct is null or notified_milestone_pct in (0,25,50,75,100));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,   -- deleting a goal deletes its notifications
  goal_name text not null check (char_length(goal_name) between 1 and 60),
  type text not null check (type in ('milestone','achieved','shareRequest')),
  milestone_pct smallint check (milestone_pct is null or milestone_pct in (25,50,75)),
  date date not null,
  read boolean not null default false,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),  -- e.g. { fromName } for shareRequest
  created_at timestamptz not null default now()
);
create index notifications_user_date_idx on public.notifications (user_id, date desc);
create index notifications_goal_id_idx on public.notifications (goal_id);
alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy "notifications_insert_own" on public.notifications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "notifications_update_own" on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notifications_delete_own" on public.notifications for delete to authenticated using ((select auth.uid()) = user_id);

-- Applied to the Supabase project as migration "create_goals_table"
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  emoji text,
  image text check (image is null or char_length(image) < 200000),
  target_amount numeric not null check (target_amount > 0),
  initial_amount numeric not null default 0 check (initial_amount >= 0),
  monthly_deposit numeric not null check (monthly_deposit >= 0),
  track_id text not null,
  annual_return_pct numeric not null check (annual_return_pct >= 0 and annual_return_pct <= 100),
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_user_id_idx on public.goals (user_id);
alter table public.goals enable row level security;
create policy "goals_select_own" on public.goals for select to authenticated using ((select auth.uid()) = user_id);
create policy "goals_insert_own" on public.goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "goals_update_own" on public.goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals_delete_own" on public.goals for delete to authenticated using ((select auth.uid()) = user_id);
create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger goals_set_updated_at before update on public.goals for each row execute function public.set_updated_at();

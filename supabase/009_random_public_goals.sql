-- Applied to the Supabase project as migrations "goals_select_own_row_visible_on_insert" and "random_public_goals"
-- 1) goal_role(id) cannot see a row that is being inserted, so creating a goal (upsert) was rejected with 403: check ownership directly on the row.
drop policy if exists "goals_select_participant" on public.goals;
create policy "goals_select_participant" on public.goals for select to authenticated
  using ((select auth.uid()) = user_id or public.goal_role(id) is not null);

-- 2) Up to 10 random public goals of OTHER users, for the "public" filter. Signed-in users only. Owner display name only (no owner id, no email).
create or replace function public.get_random_public_goals(p_limit int default 10)
returns table (id uuid, name text, emoji text, image text, target_amount numeric, initial_amount numeric, monthly_deposit numeric, track_id text,
               annual_return_pct numeric, management_fee_pct numeric, start_date date, created_at timestamptz, owner_name text)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.emoji, g.image, g.target_amount, g.initial_amount, g.monthly_deposit, g.track_id, g.annual_return_pct, g.management_fee_pct, g.start_date, g.created_at,
         public.display_name_of(g.user_id)
  from public.goals g
  where g.is_public and g.user_id <> (select auth.uid()) and (select auth.uid()) is not null
  order by random()
  limit least(greatest(coalesce(p_limit, 10), 1), 10)
$$;
revoke all on function public.get_random_public_goals(int) from public, anon;
grant execute on function public.get_random_public_goals(int) to authenticated;

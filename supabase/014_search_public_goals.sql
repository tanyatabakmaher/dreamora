-- Search the public goals of OTHER users by name ("public" filter on the goals page). Signed-in users only.
-- The function is security definer so it can read other people's rows, but it only ever returns rows that are public and not the caller's own,
-- and only the same columns as get_random_public_goals (owner display name only: no owner id, no email). The goals table's own RLS is unchanged.
create or replace function public.search_public_goals(p_query text, p_limit int default 30)
returns table (id uuid, name text, emoji text, image text, target_amount numeric, initial_amount numeric, monthly_deposit numeric, track_id text,
               annual_return_pct numeric, management_fee_pct numeric, start_date date, created_at timestamptz, owner_name text)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.emoji, g.image, g.target_amount, g.initial_amount, g.monthly_deposit, g.track_id, g.annual_return_pct, g.management_fee_pct, g.start_date, g.created_at,
         public.display_name_of(g.user_id)
  from public.goals g
  where g.is_public
    and g.user_id <> (select auth.uid()) and (select auth.uid()) is not null
    and length(btrim(coalesce(p_query, ''))) > 0
    and g.name ilike '%' || replace(replace(replace(btrim(left(p_query, 60)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by g.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 30)
$$;
revoke all on function public.search_public_goals(text, int) from public, anon;
grant execute on function public.search_public_goals(text, int) to authenticated;

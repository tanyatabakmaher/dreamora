-- Applied to the Supabase project as migration "goal_public_visibility"
-- Public visibility: a goal can be marked public = readable by any signed-in user, view only. Owner-only changes. Backward compatible: every existing goal stays is_public = false.
-- Public goals are NOT returned by the normal goals queries (the goals_select policy is unchanged); a single public goal is read by id through get_public_goal().
alter table public.goals add column if not exists is_public boolean not null default false;

-- Only the owner (or the server itself) can change the visibility; an editor's update keeps the stored value.
create or replace function public.goals_keep_owner() returns trigger language plpgsql set search_path = '' as $$
begin
  new.user_id := old.user_id;
  if (select auth.uid()) is not null and (select auth.uid()) <> old.user_id then new.is_public := old.is_public; end if;
  return new;
end $$;

-- A public goal has no invited members: turning a goal public removes its members (and their pending invitations), and none can be added while it is public.
create or replace function public.goals_public_clears_members() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_public and not old.is_public then
    delete from public.notifications where goal_id = new.id and type = 'shareRequest';
    delete from public.goal_members where goal_id = new.id;
  end if;
  return new;
end $$;
revoke all on function public.goals_public_clears_members() from public, anon, authenticated;
create trigger goals_public_clears_members after update of is_public on public.goals for each row execute function public.goals_public_clears_members();

create or replace function public.goal_members_block_public() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.goals g where g.id = new.goal_id and g.is_public) then raise exception 'public goals cannot have members' using errcode = '22023'; end if;
  return new;
end $$;
revoke all on function public.goal_members_block_public() from public, anon, authenticated;
create trigger goal_members_block_public before insert on public.goal_members for each row execute function public.goal_members_block_public();

-- Read one public goal by id (signed-in users only). Returns only goal data and the owner's display name: no owner id or email, no list of goals.
create or replace function public.get_public_goal(p_goal_id uuid)
returns table (id uuid, name text, emoji text, image text, target_amount numeric, initial_amount numeric, monthly_deposit numeric, track_id text,
               annual_return_pct numeric, start_date date, created_at timestamptz, owner_name text)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.emoji, g.image, g.target_amount, g.initial_amount, g.monthly_deposit, g.track_id, g.annual_return_pct, g.start_date, g.created_at,
         public.display_name_of(g.user_id)
  from public.goals g
  where g.id = p_goal_id and g.is_public and (select auth.uid()) is not null
$$;
revoke all on function public.get_public_goal(uuid) from public, anon;
grant execute on function public.get_public_goal(uuid) to authenticated;

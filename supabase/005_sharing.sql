-- Applied to the Supabase project as migration "goal_sharing"
-- Sharing: members are stored in goal_members; permissions are enforced here (row level security + functions), never by the client.
-- The goals.visibility / goals.members columns from 003 are replaced by this table (sharing state is derived: a goal with members is shared).
alter table public.goals drop column if exists visibility, drop column if exists members;

create table public.goal_members (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) between 3 and 254),
  user_id uuid references auth.users(id) on delete cascade,        -- set when the invitation is accepted
  role text not null default 'view' check (role in ('view','edit')),
  status text not null default 'pending' check (status in ('pending','joined')),
  invited_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (goal_id, email)
);
create index goal_members_goal_idx on public.goal_members (goal_id);
create index goal_members_user_idx on public.goal_members (user_id);
create index goal_members_email_idx on public.goal_members (email);
create index goal_members_invited_by_idx on public.goal_members (invited_by);
alter table public.goal_members enable row level security;
create trigger goal_members_set_updated_at before update on public.goal_members for each row execute function public.set_updated_at();

-- The signed-in user's permission on a goal: 'owner', 'edit', 'view', or null (no access).
create or replace function public.goal_role(gid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when g.user_id = (select auth.uid()) then 'owner'
    else (select m.role from public.goal_members m where m.goal_id = gid and m.user_id = (select auth.uid()) and m.status = 'joined')
  end
  from public.goals g where g.id = gid
$$;
revoke all on function public.goal_role(uuid) from public, anon;
grant execute on function public.goal_role(uuid) to authenticated;

-- goal_members: read-only for clients (owner sees all rows of the goal; a member sees their own row). Writes go through the functions below.
create policy "goal_members_select" on public.goal_members for select to authenticated
  using (user_id = (select auth.uid()) or public.goal_role(goal_id) = 'owner');

-- goals: owner and joined members can read; owner and 'edit' members can update; only the owner can delete.
drop policy "goals_select_own" on public.goals;
drop policy "goals_update_own" on public.goals;
drop policy "goals_delete_own" on public.goals;
create policy "goals_select_participant" on public.goals for select to authenticated using (public.goal_role(id) is not null);
create policy "goals_update_owner_or_editor" on public.goals for update to authenticated
  using (public.goal_role(id) in ('owner','edit')) with check (public.goal_role(id) in ('owner','edit'));
create policy "goals_delete_owner" on public.goals for delete to authenticated using ((select auth.uid()) = user_id);
-- an editor can never change who owns the goal
create or replace function public.goals_keep_owner() returns trigger language plpgsql set search_path = '' as $$
begin new.user_id := old.user_id; return new; end $$;
create trigger goals_keep_owner before update on public.goals for each row execute function public.goals_keep_owner();

-- Participants of goals, for the card avatars and the sharing section. Emails are returned only to the goal's owner.
create or replace function public.list_goal_sharing(p_goal_ids uuid[])
returns table (goal_id uuid, email text, name text, photo text, role text, status text, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with mine as (select g.id, g.user_id from public.goals g where g.id = any(p_goal_ids) and public.goal_role(g.id) is not null)
  select m.id, case when m.user_id = (select auth.uid()) then u.email::text end,
         coalesce(p.name, u.raw_user_meta_data ->> 'name'), p.photo, 'owner'::text, 'joined'::text, m.user_id = (select auth.uid())
  from mine m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  union all
  select gm.goal_id,
         case when public.goal_role(gm.goal_id) = 'owner' or gm.user_id = (select auth.uid()) then gm.email end,
         coalesce(p.name, u.raw_user_meta_data ->> 'name'), p.photo, gm.role, gm.status, gm.user_id = (select auth.uid())
  from public.goal_members gm
  join mine on mine.id = gm.goal_id
  left join auth.users u on u.id = gm.user_id
  left join public.profiles p on p.id = gm.user_id
  where gm.status = 'joined' or public.goal_role(gm.goal_id) = 'owner'
$$;
revoke all on function public.list_goal_sharing(uuid[]) from public, anon;
grant execute on function public.list_goal_sharing(uuid[]) to authenticated;

-- Display name of a user: profile name, else sign-up name, else the part of the email before "@".
create or replace function public.display_name_of(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(p.name, ''), nullif(u.raw_user_meta_data ->> 'name', ''), split_part(u.email::text, '@', 1))
  from auth.users u left join public.profiles p on p.id = u.id where u.id = uid
$$;
revoke all on function public.display_name_of(uuid) from public, anon, authenticated;

-- Owner applies a draft of sharing changes. p_add: [{email, role}], p_update: [{email, role}], p_remove: [email].
-- Inviting an email that belongs to an existing user also puts a "share request" notification in that user's bell.
create or replace function public.apply_goal_sharing(p_goal_id uuid, p_add jsonb default '[]', p_update jsonb default '[]', p_remove jsonb default '[]')
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  gname text; own_email text; item jsonb; em text; rl text; mid uuid; target uuid; from_name text;
begin
  if me is null or public.goal_role(p_goal_id) is distinct from 'owner' then raise exception 'not allowed' using errcode = '42501'; end if;
  select name into gname from public.goals where id = p_goal_id;
  select lower(email) into own_email from auth.users where id = me;
  from_name := public.display_name_of(me);

  for item in select * from jsonb_array_elements(coalesce(p_remove, '[]')) loop
    em := lower(trim(both '"' from item::text));
    select user_id into target from public.goal_members where goal_id = p_goal_id and email = em;
    delete from public.goal_members where goal_id = p_goal_id and email = em;
    if target is not null then delete from public.notifications where user_id = target and goal_id = p_goal_id; end if;
    delete from public.notifications where type = 'shareRequest' and goal_id = p_goal_id and payload ->> 'email' = em;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(p_update, '[]')) loop
    em := lower(trim(item ->> 'email')); rl := item ->> 'role';
    if rl not in ('view','edit') then raise exception 'bad role' using errcode = '22023'; end if;
    update public.goal_members set role = rl where goal_id = p_goal_id and email = em;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(p_add, '[]')) loop
    em := lower(trim(item ->> 'email')); rl := coalesce(item ->> 'role', 'view');
    if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(em) > 254 then raise exception 'bad email' using errcode = '22023'; end if;
    if rl not in ('view','edit') then raise exception 'bad role' using errcode = '22023'; end if;
    if em = own_email then continue; end if;
    if (select count(*) from public.goal_members where goal_id = p_goal_id) >= 20 then raise exception 'too many members' using errcode = '22023'; end if;
    insert into public.goal_members (goal_id, email, role, invited_by) values (p_goal_id, em, rl, me)
      on conflict (goal_id, email) do nothing returning id into mid;
    if mid is not null then
      select id into target from auth.users where lower(email) = em limit 1;
      if target is not null then
        insert into public.notifications (user_id, goal_id, goal_name, type, date, payload)
        values (target, p_goal_id, gname, 'shareRequest', current_date, jsonb_build_object('fromName', from_name, 'memberId', mid, 'email', em, 'state', 'pending'));
      end if;
    end if;
  end loop;
end $$;
revoke all on function public.apply_goal_sharing(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.apply_goal_sharing(uuid, jsonb, jsonb, jsonb) to authenticated;

-- The invited user answers a share request from their notifications. Returns the goal id on accept, null on decline.
create or replace function public.respond_share_request(p_notification_id uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid()); n public.notifications; my_email text; mid uuid; gid uuid;
begin
  select * into n from public.notifications where id = p_notification_id and user_id = me and type = 'shareRequest';
  if not found or coalesce(n.payload ->> 'state', 'pending') <> 'pending' then raise exception 'not allowed' using errcode = '42501'; end if;
  select lower(email) into my_email from auth.users where id = me;
  mid := (n.payload ->> 'memberId')::uuid;
  if p_accept then
    update public.goal_members set status = 'joined', user_id = me where id = mid and email = my_email and status = 'pending' returning goal_id into gid;
  else
    delete from public.goal_members where id = mid and email = my_email and status = 'pending';
  end if;
  update public.notifications set read = true,
    payload = n.payload || jsonb_build_object('state', case when p_accept and gid is not null then 'accepted' else 'declined' end)
    where id = n.id;
  return gid;
end $$;
revoke all on function public.respond_share_request(uuid, boolean) from public, anon;
grant execute on function public.respond_share_request(uuid, boolean) to authenticated;

-- Invitations sent to an email before the person had an account (or while the app was closed): create their notifications. Safe to call repeatedly.
create or replace function public.sync_share_requests() returns integer
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); my_email text; r record; made integer := 0;
begin
  if me is null then return 0; end if;
  select lower(email) into my_email from auth.users where id = me;
  for r in
    select gm.id, gm.goal_id, gm.invited_by, g.name from public.goal_members gm join public.goals g on g.id = gm.goal_id
    where gm.status = 'pending' and gm.email = my_email
      and not exists (select 1 from public.notifications n where n.user_id = me and n.type = 'shareRequest' and n.payload ->> 'memberId' = gm.id::text)
  loop
    insert into public.notifications (user_id, goal_id, goal_name, type, date, payload)
    values (me, r.goal_id, r.name, 'shareRequest', current_date,
            jsonb_build_object('fromName', public.display_name_of(r.invited_by), 'memberId', r.id, 'email', my_email, 'state', 'pending'));
    made := made + 1;
  end loop;
  return made;
end $$;
revoke all on function public.sync_share_requests() from public, anon;
grant execute on function public.sync_share_requests() to authenticated;

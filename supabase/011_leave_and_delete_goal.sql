-- Applied to the Supabase project as migration "leave_and_delete_goal"
-- A participant can leave a shared goal (it disappears from their list and from the participants; the owner gets a bell notification).
-- The owner deleting a goal tells every participant who had joined, by name. Clients cannot insert notifications for other users, so both run as functions.
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.notifications'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%shareRequest%' loop
    execute format('alter table public.notifications drop constraint %I', c);
  end loop;
end $$;
alter table public.notifications add constraint notifications_type_check check (type in ('milestone','achieved','shareRequest','goalLeft','goalDeleted'));

create or replace function public.leave_goal(p_goal_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); owner_id uuid; gname text; gone integer;
begin
  if me is null then raise exception 'not allowed' using errcode = '42501'; end if;
  select user_id, name into owner_id, gname from public.goals where id = p_goal_id;
  delete from public.goal_members where goal_id = p_goal_id and user_id = me and status = 'joined';
  get diagnostics gone = row_count;
  if gone = 0 then raise exception 'not allowed' using errcode = '42501'; end if;
  delete from public.notifications where user_id = me and goal_id = p_goal_id;
  insert into public.notifications (user_id, goal_id, goal_name, type, date, payload)
  values (owner_id, p_goal_id, gname, 'goalLeft', current_date, jsonb_build_object('fromName', public.display_name_of(me)));
end $$;
revoke all on function public.leave_goal(uuid) from public, anon;
grant execute on function public.leave_goal(uuid) to authenticated;

create or replace function public.delete_goal(p_goal_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); gname text; from_name text;
begin
  if me is null or public.goal_role(p_goal_id) is distinct from 'owner' then raise exception 'not allowed' using errcode = '42501'; end if;
  select name into gname from public.goals where id = p_goal_id;
  from_name := public.display_name_of(me);
  insert into public.notifications (user_id, goal_id, goal_name, type, date, payload)
  select gm.user_id, null, gname, 'goalDeleted', current_date, jsonb_build_object('fromName', from_name)
  from public.goal_members gm where gm.goal_id = p_goal_id and gm.status = 'joined' and gm.user_id is not null;
  delete from public.goals where id = p_goal_id;
end $$;
revoke all on function public.delete_goal(uuid) from public, anon;
grant execute on function public.delete_goal(uuid) to authenticated;

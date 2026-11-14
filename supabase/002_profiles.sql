-- Applied to the Supabase project as migration "create_profiles_table"
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text check (name is null or char_length(name) between 1 and 60),
  phone text check (phone is null or char_length(phone) <= 30),
  photo text check (photo is null or char_length(photo) < 200000),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

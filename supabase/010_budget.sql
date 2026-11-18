-- "התקציב שלי": one row per user. NOT yet applied to the Supabase project.
create table public.budgets (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  pool numeric not null default 0 check (pool >= 0 and pool < 1e12),
  income numeric not null default 0 check (income >= 0 and income < 1e12),
  expenses numeric not null default 0 check (expenses >= 0 and expenses < 1e12),
  saving numeric not null default 0 check (saving >= 0 and saving < 1e12),
  updated_at timestamptz not null default now()
);
alter table public.budgets enable row level security;
create policy "budgets_select_own" on public.budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy "budgets_insert_own" on public.budgets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "budgets_update_own" on public.budgets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "budgets_delete_own" on public.budgets for delete to authenticated using ((select auth.uid()) = user_id);
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();

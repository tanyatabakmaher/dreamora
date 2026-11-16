-- Applied to the Supabase project as migration "goals_management_fee"
alter table public.goals add column if not exists management_fee_pct numeric not null default 0 check (management_fee_pct >= 0 and management_fee_pct <= 100);

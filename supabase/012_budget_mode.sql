-- "התקציב שלי": which tab the user chose ('s' = monthly deposit only, 'ie' = income and expenses) and the deposit they typed in the first tab.
-- `saving` stays the amount the app uses (the typed deposit in 's', income minus expenses in 'ie'); income and expenses are kept when the user switches tabs.
alter table public.budgets
  add column mode text not null default 's' check (mode in ('s', 'ie')),
  add column saving_manual numeric not null default 0 check (saving_manual >= 0 and saving_manual < 1e12);
update public.budgets set
  mode = case when income = 0 and expenses = 0 and saving > 0 then 's' else 'ie' end,
  saving_manual = case when income = 0 and expenses = 0 then saving else 0 end;

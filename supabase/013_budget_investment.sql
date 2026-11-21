-- "ההשקעה שלי": where the money that is not allocated to a goal is invested.
-- invest_track / invest_since = the current track and its start date; invest_ret / invest_fee = the user's own yearly return and fee for it (null = the track's defaults);
-- invest_monthly = the monthly amount the user chose (null = all that is left of the saving after the goals); invest_history = earlier periods [{trackId, since, until, ret, fee}].
alter table public.budgets
  add column invest_track text check (invest_track is null or char_length(invest_track) <= 30),
  add column invest_since date,
  add column invest_ret numeric check (invest_ret is null or (invest_ret >= 0 and invest_ret <= 100)),
  add column invest_fee numeric check (invest_fee is null or (invest_fee >= 0 and invest_fee <= 10)),
  add column invest_monthly numeric check (invest_monthly is null or (invest_monthly >= 0 and invest_monthly < 1e12)),
  add column invest_history jsonb not null default '[]'::jsonb check (jsonb_typeof(invest_history) = 'array' and jsonb_array_length(invest_history) <= 200);

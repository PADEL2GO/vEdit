
-- Rename weekly_free_minutes to monthly_free_minutes and multiply by 4
ALTER TABLE public.club_court_assignments RENAME COLUMN weekly_free_minutes TO monthly_free_minutes;
ALTER TABLE public.club_court_assignments DROP COLUMN weekly_reset_weekday;
UPDATE public.club_court_assignments SET monthly_free_minutes = monthly_free_minutes * 4;

-- Same for legacy table
ALTER TABLE public.club_owner_assignments RENAME COLUMN weekly_free_minutes TO monthly_free_minutes;
ALTER TABLE public.club_owner_assignments DROP COLUMN weekly_reset_weekday;
UPDATE public.club_owner_assignments SET monthly_free_minutes = monthly_free_minutes * 4;

-- Rename week_start_date to month_start_date in ledger
ALTER TABLE public.club_quota_ledger RENAME COLUMN week_start_date TO month_start_date;
UPDATE public.club_quota_ledger SET month_start_date = date_trunc('month', month_start_date::timestamp)::date;

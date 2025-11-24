-- Trigger functions and triggers for gamification events

-- Helper: record daily activity
create or replace function public.record_daily_activity(p_user uuid, p_type text)
returns void language plpgsql as $$
begin
  insert into public.daily_activity (user_id, activity_date, activity_type)
    values (p_user, current_date, p_type)
    on conflict (user_id, activity_date, activity_type) do nothing;
end;
$$;

-- 1. EXPENSE LOGGED ---------------------------------------------------------
-- Awards 10 points and records activity when an expense is inserted.
create or replace function public.expense_gamification()
returns trigger language plpgsql as $$
begin
  -- Add points
  perform public.award_points(NEW.user_id, 10);
  -- Record activity
  perform public.record_daily_activity(NEW.user_id, 'expense_logged');
  return NEW;
end;
$$;

-- Attach trigger to expenses table (if exists)
DO $$
BEGIN
  IF EXISTS (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'expenses'
  ) THEN
    create trigger trg_expense_gamification
      after insert on public.expenses
      for each row execute procedure public.expense_gamification();
  END IF;
END $$;

-- 2. BILL PAID (optional) ----------------------------------------------------
-- Awards 15 points when bill.status changes to 'paid'.
create or replace function public.bill_paid_gamification()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'UPDATE' and NEW.status = 'paid' and OLD.status is distinct from 'paid' then
    perform public.award_points(NEW.user_id, 15);
    perform public.record_daily_activity(NEW.user_id, 'bill_paid');
  end if;
  return NEW;
end;
$$;

DO $$
BEGIN
  IF EXISTS (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'bills'
  ) THEN
    create trigger trg_bill_paid_gamification
      after update on public.bills
      for each row execute procedure public.bill_paid_gamification();
  END IF;
END $$;

-- 3. DAILY_LOGIN (optional) --------------------------------------------------
-- Call record_daily_activity() from your auth hooks or application logic.

-- END OF MIGRATION

-- ================================================
-- Intelligent Bill Management 📅 (Standalone)
-- ================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ENUMs
do $$
begin
  if not exists (select 1 from pg_type where typname = 'bill_frequency') then
    create type bill_frequency as enum (
      'once', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'bill_status') then
    create type bill_status as enum ('unpaid', 'paid', 'overdue', 'cancelled');
  end if;
end $$;

-- ================================================
-- Bill Categories
-- ================================================

create table if not exists bill_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  icon text,
  created_at timestamptz default now()
);

-- Seed some common categories
insert into bill_categories (name, description)
values
  ('Utilities', 'Electricity, Water, Gas, Trash'),
  ('Rent/Mortgage', 'Monthly housing payments'),
  ('Insurance', 'Health, auto, property insurance'),
  ('Telecom', 'Internet, mobile, cable'),
  ('Credit Card', 'Recurring credit card minimums')
on conflict do nothing;

-- ================================================
-- Bills Table
-- ================================================

create table if not exists bills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  description text,
  amount_due numeric(14,2) not null check (amount_due >= 0),
  currency text default 'USD',
  frequency bill_frequency default 'monthly',
  next_due_date date not null,
  category_id uuid references bill_categories(id),
  is_automatic boolean default false, -- auto-pay enabled
  status bill_status default 'unpaid',
  last_paid_date date,
  reminder_days int default 3 check (reminder_days >= 0),
  expected_payment_account text,
  vendor text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- Bill Payment History
-- ================================================

create table if not exists bill_payments (
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid not null references bills(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  amount_paid numeric(14,2) not null check (amount_paid >= 0),
  payment_date date not null,
  payment_method text,
  note text,
  created_at timestamptz default now()
);

-- ================================================
-- Bill Price Change Alerts
-- ================================================

create table if not exists bill_price_changes (
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid not null references bills(id) on delete cascade,
  old_amount numeric(14,2) not null,
  new_amount numeric(14,2) not null,
  changed_at timestamptz default now(),
  reason text
);

-- ================================================
-- Trigger: Auto-update Bill Status & Reminder Logic
-- ================================================

create or replace function update_bill_status_on_payment()
returns trigger as $$
begin
  update bills
  set
    last_paid_date = new.payment_date,
    next_due_date = (
      case frequency
        when 'weekly' then new.payment_date + interval '7 days'
        when 'bi_weekly' then new.payment_date + interval '14 days'
        when 'monthly' then new.payment_date + interval '1 month'
        when 'quarterly' then new.payment_date + interval '3 months'
        when 'semi_annual' then new.payment_date + interval '6 months'
        when 'annual' then new.payment_date + interval '1 year'
        else null
      end
    ),
    status = 'paid',
    updated_at = current_timestamp
  where id = new.bill_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bill_payment_update on bill_payments;

create trigger trg_bill_payment_update
after insert on bill_payments
for each row execute procedure update_bill_status_on_payment();

-- ================================================
-- Trigger: Auto-insert Price Change Record
-- ================================================

create or replace function track_price_change()
returns trigger as $$
begin
  if new.amount_due <> old.amount_due then
    insert into bill_price_changes (bill_id, old_amount, new_amount)
    values (new.id, old.amount_due, new.amount_due);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_track_bill_price_change on bills;

create trigger trg_track_bill_price_change
before update on bills
for each row when (old.amount_due is distinct from new.amount_due)
execute procedure track_price_change();

-- ================================================
-- RLS: Secure user-specific bill access
-- ================================================

alter table bills enable row level security;
alter table bill_payments enable row level security;
alter table bill_price_changes enable row level security;

create policy "Users can manage their own bills"
on bills for all using (user_id = auth.uid());

create policy "Users can manage their own bill payments"
on bill_payments for all using (user_id = auth.uid());

create policy "Users can view their own price change alerts"
on bill_price_changes for select using (
  bill_id in (select id from bills where user_id = auth.uid())
);

-- ================================================
-- Indexes
-- ================================================

create index if not exists idx_bills_user on bills(user_id);
create index if not exists idx_bills_due_date on bills(next_due_date);
create index if not exists idx_bill_payments_user on bill_payments(user_id);
create index if not exists idx_bill_price_changes_bill on bill_price_changes(bill_id);

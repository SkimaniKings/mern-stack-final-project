-- ===============================================
-- Expense Tracking Schema for Ultimate Personal Finance Tracker
-- ===============================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists postgis;  -- For geospatial functions
create extension if not exists pg_cron;  -- For scheduled tasks

-- Functions
create or replace function update_modified_column()
returns trigger as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$ language plpgsql;

-- ENUMs for Recurrence Frequencies
create type recurrence_frequency as enum (
  'none', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'
);

-- Main Expenses Table
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  budget_item_id uuid references budget_items(id) on delete set null,
  merchant text,  -- Where the expense took place
  amount numeric(12, 2) not null,
  currency text default 'USD',
  expense_date timestamptz not null,  -- Date of expense
  location_name text,  -- Location name for search
  location_geo geography(Point, 4326),  -- Geo-tagged for location-based analysis
  receipt_url text,  -- URL for uploaded receipt
  warranty_expiration_date date,  -- Warranty expiration for items
  recurrence recurrence_frequency default 'none',  -- Recurrence options
  is_impulse boolean default false,  -- Flag for impulse purchases
  notes text,  -- Notes about the expense
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Expense Categories (optional and separate from budget categories)
create table if not exists expense_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  parent_id uuid references expense_categories(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Expense -> Category mapping (many-to-many)
create table if not exists expense_category_links (
  expense_id uuid references expenses(id) on delete cascade,
  category_id uuid references expense_categories(id) on delete cascade,
  primary key (expense_id, category_id)
);

-- Split Expenses (for shared expenses between users)
create table if not exists split_expenses (
  id uuid primary key default uuid_generate_v4(),
  expense_id uuid references expenses(id) on delete cascade,
  shared_with_user uuid references auth.users on delete cascade,  -- Who the expense is shared with
  amount numeric(12, 2) not null,  -- Amount paid by the shared user
  note text,  -- Additional note for the split
  created_at timestamptz default now()
);

-- Triggers for automatic timestamp updates
create trigger set_timestamp_expenses
before update on expenses
for each row execute procedure update_modified_column();

create trigger set_timestamp_categories
before update on expense_categories
for each row execute procedure update_modified_column();

create trigger set_timestamp_split_expenses
before update on split_expenses
for each row execute procedure update_modified_column();

-- RLS (Row Level Security) Policies
alter table expenses enable row level security;
alter table expense_categories enable row level security;
alter table split_expenses enable row level security;

-- Allow user access to their own expenses
create policy "Allow user access to own expenses"
  on expenses for all
  using (auth.uid() = user_id);

-- Allow user access to their own expense categories
create policy "Allow user access to their own expense categories"
  on expense_categories for all
  using (auth.uid() = user_id);

-- Allow user access to their split expenses
create policy "Allow user access to their split expenses"
  on split_expenses for all
  using (auth.uid() = shared_with_user);

-- Searching for expenses by location name
create index if not exists idx_expenses_location_name
  on expenses (location_name);

-- Search expenses by location and date range (for analysis)
create or replace function search_expenses_by_location_and_date_range(
  search_location text, start_date date, end_date date)
returns table (
  expense_id uuid,
  user_id uuid,
  merchant text,
  amount numeric(12, 2),
  expense_date timestamptz,
  location_name text,
  location_geo geography,
  receipt_url text,
  warranty_expiration_date date,
  recurrence recurrence_frequency,
  is_impulse boolean,
  notes text
) as $$
begin
  return query
    select id, user_id, merchant, amount, expense_date, location_name, location_geo, receipt_url, warranty_expiration_date, recurrence, is_impulse, notes
    from expenses
    where location_name ilike '%' || search_location || '%'
    and expense_date between start_date and end_date;
end;
$$ language plpgsql;

-- Automatic Recurring Expenses (add future instances of recurring expenses)
create or replace function create_recurring_expenses()
returns void as $$
declare
  exp_record record;
begin
  for exp_record in
    select * from expenses where recurrence != 'none'
  loop
    -- Logic to calculate and insert new recurring expense
    -- This can vary based on the recurrence frequency
    if exp_record.recurrence = 'weekly' then
      -- Insert next weekly expense
      insert into expenses (user_id, merchant, amount, expense_date, location_name, location_geo, receipt_url, warranty_expiration_date, recurrence, is_impulse, notes)
      values (exp_record.user_id, exp_record.merchant, exp_record.amount, exp_record.expense_date + interval '1 week', exp_record.location_name, exp_record.location_geo, exp_record.receipt_url, exp_record.warranty_expiration_date, exp_record.recurrence, exp_record.is_impulse, exp_record.notes);
    elsif exp_record.recurrence = 'bi_weekly' then
      -- Insert next bi-weekly expense
      insert into expenses (user_id, merchant, amount, expense_date, location_name, location_geo, receipt_url, warranty_expiration_date, recurrence, is_impulse, notes)
      values (exp_record.user_id, exp_record.merchant, exp_record.amount, exp_record.expense_date + interval '2 weeks', exp_record.location_name, exp_record.location_geo, exp_record.receipt_url, exp_record.warranty_expiration_date, exp_record.recurrence, exp_record.is_impulse, exp_record.notes);
    -- Add logic for other recurrence types (monthly, quarterly, etc.)
    end if;
  end loop;
end;
$$ language plpgsql;

-- Task scheduling for recurring expenses using pg_cron
select cron.schedule('Recurring Expense Task', '0 0 * * *',  -- Runs daily at midnight
  $$ perform create_recurring_expenses(); $$);

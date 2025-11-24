-- ===============================================
-- Income Management Schema (Updated + Monthly Equivalents)
-- ===============================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- ENUMs
do $$
begin
  if not exists (select 1 from pg_type where typname = 'income_recurrence_frequency') then
    create type income_recurrence_frequency as enum (
      'none', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'tax_type') then
    create type tax_type as enum ('none', 'pre_tax', 'post_tax');
  end if;
end $$;

-- Income Categories
create table if not exists income_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  parent_id uuid references income_categories(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Main Income Table
create table if not exists incomes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  source_name text not null,
  amount numeric(14, 2) not null,
  currency text default 'USD',
  category_id uuid references income_categories(id) on delete set null,
  is_taxable boolean default true,
  tax_class tax_type default 'post_tax',
  recurrence income_recurrence_frequency default 'none',
  start_date date not null,
  end_date date,
  notes text,
  monthly_equivalent_amount numeric(14, 2) generated always as (
    case recurrence
      when 'weekly' then amount * 52 / 12
      when 'bi_weekly' then amount * 26 / 12
      when 'monthly' then amount
      when 'quarterly' then amount / 3
      when 'semi_annual' then amount / 6
      when 'annual' then amount / 12
      else amount
    end
  ) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Deductions
create table if not exists income_deductions (
  id uuid primary key default uuid_generate_v4(),
  income_id uuid references incomes(id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null,
  tax_class tax_type not null,
  created_at timestamptz default now()
);

-- Side Hustles
create table if not exists income_hustles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  income_id uuid references incomes(id) on delete cascade,
  hustle_name text not null,
  hustle_amount numeric(12, 2) not null,
  created_at timestamptz default now()
);

-- Triggers for updated_at
create or replace function update_modified_column()
returns trigger as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp_incomes on incomes;
drop trigger if exists set_timestamp_income_categories on income_categories;

create trigger set_timestamp_incomes
before update on incomes
for each row execute procedure update_modified_column();

create trigger set_timestamp_income_categories
before update on income_categories
for each row execute procedure update_modified_column();

-- RLS
alter table incomes enable row level security;
alter table income_categories enable row level security;
alter table income_deductions enable row level security;
alter table income_hustles enable row level security;

drop policy if exists "User can manage their own incomes" on incomes;
drop policy if exists "User can manage their own income categories" on income_categories;
drop policy if exists "User can manage their own income deductions" on income_deductions;
drop policy if exists "User can manage their own income hustles" on income_hustles;

create policy "User can manage their own incomes"
on incomes for all using (auth.uid() = user_id);

create policy "User can manage their own income categories"
on income_categories for all using (auth.uid() = user_id);

create policy "User can manage their own income deductions"
on income_deductions for all using (
  income_id in (select id from incomes where user_id = auth.uid())
);

create policy "User can manage their own income hustles"
on income_hustles for all using (user_id = auth.uid());

-- Recurrence Automation
create or replace function create_recurring_incomes()
returns void as $$
declare
  rec record;
  next_date date;
begin
  for rec in
    select * from incomes
    where recurrence != 'none'
      and (end_date is null or current_date <= end_date)
  loop
    case rec.recurrence
      when 'weekly' then next_date := rec.start_date + interval '1 week';
      when 'bi_weekly' then next_date := rec.start_date + interval '2 weeks';
      when 'monthly' then next_date := rec.start_date + interval '1 month';
      when 'quarterly' then next_date := rec.start_date + interval '3 months';
      when 'semi_annual' then next_date := rec.start_date + interval '6 months';
      when 'annual' then next_date := rec.start_date + interval '1 year';
      else continue;
    end case;

    if not exists (
      select 1 from incomes
      where user_id = rec.user_id
        and source_name = rec.source_name
        and start_date = next_date
    ) then
      insert into incomes (
        user_id, source_name, amount, currency, category_id, is_taxable, tax_class,
        recurrence, start_date, end_date, notes
      )
      values (
        rec.user_id, rec.source_name, rec.amount, rec.currency, rec.category_id,
        rec.is_taxable, rec.tax_class, rec.recurrence,
        next_date, rec.end_date, rec.notes
      );
    end if;
  end loop;
end;
$$ language plpgsql;

-- Schedule recurring job daily
select cron.schedule('Daily Income Recurrence', '0 2 * * *', $$ perform create_recurring_incomes(); $$);

-- Diversification Score Function
create or replace function income_diversification_score(p_user_id uuid)
returns numeric as $$
declare
  category_count int;
  total_incomes int;
begin
  select count(distinct category_id) into category_count from incomes where user_id = p_user_id;
  select count(*) into total_incomes from incomes where user_id = p_user_id;
  if total_incomes = 0 then
    return 0;
  else
    return round((category_count::numeric / total_incomes::numeric) * 100, 2);
  end if;
end;
$$ language plpgsql;

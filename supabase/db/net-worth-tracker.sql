-- ========================================
-- NET WORTH TRACKER
-- ========================================

-- Table to track user's assets (e.g., cash, investments, real estate)
create table if not exists assets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    asset_type text not null check (asset_type in ('cash', 'real_estate', 'stocks', 'bonds', 'cryptocurrency', 'business', 'other')),
    description text,
    value numeric not null, -- Value of the asset
    acquisition_date timestamptz,
    is_liquid boolean default false, -- Whether the asset is liquid (e.g., cash, stocks)
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Table to track user's liabilities (e.g., loans, mortgages, credit card debt)
create table if not exists liabilities (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    liability_type text not null check (liability_type in ('mortgage', 'student_loan', 'credit_card', 'auto_loan', 'personal_loan', 'business_debt', 'other')),
    description text,
    amount_due numeric not null, -- Amount owed
    interest_rate numeric, -- Applicable interest rate for the liability
    due_date timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Trigger to update 'updated_at' on asset change
create or replace function update_asset_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_update_assets_updated
before update on assets
for each row
execute procedure update_asset_updated_at();

-- Trigger to update 'updated_at' on liability change
create or replace function update_liability_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_update_liabilities_updated
before update on liabilities
for each row
execute procedure update_liability_updated_at();

-- Table to track net worth over time
create table if not exists net_worth_tracker (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    date_recorded timestamptz default now(),
    total_assets numeric not null,
    total_liabilities numeric not null,
    net_worth numeric not null,
    created_at timestamptz default now()
);

-- Function to calculate and insert net worth
create or replace function calculate_net_worth()
returns trigger as $$
begin
  insert into net_worth_tracker (user_id, total_assets, total_liabilities, net_worth)
  select 
    new.user_id,
    coalesce((select sum(value) from assets where user_id = new.user_id), 0),
    coalesce((select sum(amount_due) from liabilities where user_id = new.user_id), 0),
    coalesce((select sum(value) from assets where user_id = new.user_id), 0)
    - coalesce((select sum(amount_due) from liabilities where user_id = new.user_id), 0);
  return new;
end;
$$ language plpgsql;

-- Triggers to calculate net worth on asset or liability insert/update
create trigger trg_calculate_net_worth_asset
after insert or update on assets
for each row
execute procedure calculate_net_worth();

create trigger trg_calculate_net_worth_liability
after insert or update on liabilities
for each row
execute procedure calculate_net_worth();

-- View for current net worth
create or replace view current_net_worth as 
select 
    a.user_id,
    coalesce(sum(a.value), 0) as total_assets,
    coalesce(sum(l.amount_due), 0) as total_liabilities,
    coalesce(sum(a.value), 0) - coalesce(sum(l.amount_due), 0) as current_net_worth
from 
    assets a
left join liabilities l on a.user_id = l.user_id
group by a.user_id;

-- View for net worth history
create or replace view net_worth_history as 
select 
    user_id,
    date_recorded,
    total_assets,
    total_liabilities,
    net_worth
from net_worth_tracker
order by date_recorded desc;

-- ========================================
-- END OF NET WORTH TRACKER
-- ========================================

-- ========================================
-- ACCOUNTS MODULE
-- ========================================

-- Create table for financial accounts
create table if not exists accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    name text not null,
    account_type text not null check (account_type in ('checking', 'savings', 'credit_card', 'investment', 'loan', 'cash', 'other')),
    institution text,
    account_number text,
    currency text default 'USD',
    balance numeric not null default 0,
    is_active boolean default true,
    is_primary boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Trigger to update 'updated_at'
create or replace function update_account_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_update_account_updated
before update on accounts
for each row
execute procedure update_account_updated_at();

-- Transaction linkage across modules
alter table if exists expenses
add column if not exists account_id uuid references accounts(id) on delete set null;

alter table if exists incomes
add column if not exists account_id uuid references accounts(id) on delete set null;

alter table if exists bills
add column if not exists account_id uuid references accounts(id) on delete set null;

alter table if exists investments
add column if not exists account_id uuid references accounts(id) on delete set null;

alter table if exists financial_goals
add column if not exists account_id uuid references accounts(id) on delete set null;

-- Audit trail for account balance changes
create table if not exists account_balance_history (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references accounts(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    balance numeric not null,
    change_type text not null check (change_type in ('income', 'expense', 'adjustment', 'investment', 'bill_payment', 'transfer', 'goal_contribution')),
    related_entity_id uuid,
    related_entity_type text,
    note text,
    recorded_at timestamptz default now()
);

-- View to summarize balances by account type
create or replace view account_balances_summary as
select 
    user_id,
    account_type,
    sum(balance) as total_balance
from accounts
where is_active = true
group by user_id, account_type;

-- View: Cash inflows and outflows per account
create or replace view account_cash_flow_view as
with inflows as (
    select
        account_id,
        user_id,
        sum(amount) as total_inflow
    from incomes
    where account_id is not null
    group by account_id, user_id
),
outflows as (
    select
        account_id,
        user_id,
        sum(amount) as total_outflow
    from expenses
    where account_id is not null
    group by account_id, user_id
)
select
    a.id as account_id,
    a.user_id,
    a.name as account_name,
    a.account_type,
    coalesce(i.total_inflow, 0) as total_inflow,
    coalesce(o.total_outflow, 0) as total_outflow
from accounts a
left join inflows i on a.id = i.account_id
left join outflows o on a.id = o.account_id;

-- View: Net cash position = inflow - outflow
create or replace view net_cash_position_view as
select
    acf.account_id,
    acf.user_id,
    acf.account_name,
    acf.account_type,
    acf.total_inflow,
    acf.total_outflow,
    (acf.total_inflow - acf.total_outflow) as net_cash_position
from account_cash_flow_view acf;


-- ========================================
-- END OF ACCOUNTS MODULE
-- ========================================

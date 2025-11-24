-- ========================================
-- PREREQUISITE: STUB FOR INVESTMENTS TABLE
-- ========================================
create table if not exists investments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    name text not null,
    investment_type text,
    amount_invested numeric not null,
    date_invested date not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ========================================
-- ADVANCED CATEGORY SYSTEM INTEGRATION
-- ========================================

-- Category hierarchy with parent-child
create table if not exists categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    name text not null,
    description text,
    parent_category_id uuid references categories(id) on delete cascade,
    is_temporary boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_update_categories_updated
before update on categories
for each row
execute procedure update_updated_at_column();

-- Rule engine for auto-categorization
create table if not exists category_rules (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    name text not null,
    match_field text not null check (match_field in ('merchant', 'note', 'tag', 'location', 'goal_name', 'bill_name', 'investment_type')),
    match_operator text not null check (match_operator in ('equals', 'contains', 'starts_with', 'ends_with')),
    match_value text not null,
    category_id uuid not null references categories(id) on delete cascade,
    applies_to text[] not null default array['expense', 'income', 'goal', 'bill', 'investment'],
    priority int default 1,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- ML training records
create table if not exists category_training_data (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    transaction_text text not null,
    category_id uuid not null references categories(id) on delete cascade,
    source_type text not null check (source_type in ('expense', 'income', 'goal', 'bill', 'investment')),
    created_at timestamptz default now()
);

-- Suggested categories
create table if not exists category_suggestions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    transaction_id uuid not null,
    transaction_type text not null check (transaction_type in ('expense', 'income', 'goal', 'bill', 'investment')),
    suggested_category_id uuid not null references categories(id) on delete cascade,
    confidence_score numeric,
    approved boolean,
    approved_at timestamptz,
    created_at timestamptz default now()
);

-- Category splits
create table if not exists transaction_category_splits (
    id uuid primary key default gen_random_uuid(),
    transaction_id uuid not null,
    transaction_type text not null check (transaction_type in ('expense', 'income', 'goal', 'bill', 'investment')),
    category_id uuid not null references categories(id) on delete cascade,
    amount numeric not null,
    note text,
    created_at timestamptz default now()
);

-- ========================================
-- LINK TO OTHER ENTITIES
-- ========================================

alter table if exists expenses
add column if not exists category_id uuid references categories(id) on delete set null;

alter table if exists incomes
add column if not exists category_id uuid references categories(id) on delete set null;

alter table if exists budget_categories
add column if not exists category_id uuid references categories(id) on delete set null;

alter table if exists financial_goals
add column if not exists category_id uuid references categories(id) on delete set null;

alter table if exists bills
add column if not exists category_id uuid references categories(id) on delete set null;

alter table if exists investments
add column if not exists category_id uuid references categories(id) on delete set null;

-- ========================================
-- SUMMARY VIEWS
-- ========================================

create or replace view categorized_expense_summary as
select 
    e.user_id,
    c.id as category_id,
    c.name as category_name,
    sum(e.amount) as total_spent
from expenses e
left join categories c on e.category_id = c.id
group by e.user_id, c.id, c.name;

create or replace view categorized_income_summary as
select 
    i.user_id,
    c.id as category_id,
    c.name as category_name,
    sum(i.amount) as total_earned
from incomes i
left join categories c on i.category_id = c.id
group by i.user_id, c.id, c.name;

create or replace view categorized_bill_summary as
select 
    b.user_id,
    c.id as category_id,
    c.name as category_name,
    sum(b.amount_due) as total_billed
from bills b
left join categories c on b.category_id = c.id
group by b.user_id, c.id, c.name;

create or replace view categorized_investment_summary as
select 
    i.user_id,
    c.id as category_id,
    c.name as category_name,
    sum(i.amount_invested) as total_invested
from investments i
left join categories c on i.category_id = c.id
group by i.user_id, c.id, c.name;

create or replace view categorized_goal_contributions as
select 
    fg.user_id,
    c.id as category_id,
    c.name as category_name,
    sum(gc.amount) as total_contributed
from goal_contributions gc
join financial_goals fg on gc.goal_id = fg.id
left join categories c on fg.category_id = c.id
group by fg.user_id, c.id, c.name;

create or replace view transaction_category_split_totals as
select 
    user_id,
    category_id,
    sum(amount) as total_split,
    count(*) as transaction_count
from (
    select 
        case 
          when transaction_type = 'expense' then (select user_id from expenses where id = tcs.transaction_id)
          when transaction_type = 'income' then (select user_id from incomes where id = tcs.transaction_id)
          when transaction_type = 'goal' then (select user_id from financial_goals where id = tcs.transaction_id)
          when transaction_type = 'bill' then (select user_id from bills where id = tcs.transaction_id)
          when transaction_type = 'investment' then (select user_id from investments where id = tcs.transaction_id)
          else null
        end as user_id,
        tcs.category_id,
        tcs.amount
    from transaction_category_splits tcs
) sub
where user_id is not null
group by user_id, category_id;

-- ========================================
-- END OF INTEGRATION
-- ========================================

-- ===============================================
-- Budgeting Schema for Ultimate Personal Finance Tracker
-- ===============================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Functions
create or replace function update_modified_column()
returns trigger as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$ language plpgsql;

-- ENUMs
create type budget_model_type as enum (
  'traditional', 'zero_based', 'fifty_thirty_twenty', 'envelope', 'custom'
);

-- Main Budgets Table
create table if not exists budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  description text,
  model budget_model_type default 'traditional',
  start_date date not null,
  end_date date not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Budget Templates (for weddings, new baby, etc.)
create table if not exists budget_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  model budget_model_type default 'traditional',
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Budget Categories (e.g., Housing, Transportation)
create table if not exists budget_categories (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references budgets(id) on delete cascade,
  name text not null,
  description text,
  parent_category_id uuid references budget_categories(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Budget Items (specific line items with allocations)
create table if not exists budget_items (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references budget_categories(id) on delete cascade,
  amount numeric(12, 2) not null,
  actual_amount numeric(12, 2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Shared Budgets (Collaborative budgeting)
create table if not exists shared_budgets (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references budgets(id) on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text check (role in ('owner', 'editor', 'viewer')) default 'viewer',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Budget Scenarios (for what-if planning)
create table if not exists budget_scenarios (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references budgets(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Dynamic Adjustments (for reactive budgets)
create table if not exists budget_adjustments (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references budget_items(id) on delete cascade,
  amount_change numeric(12, 2) not null,
  reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AI Budget Generator Metadata (stub for future ML integration)
create table if not exists ai_budget_generator_logs (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid references budgets(id) on delete cascade,
  result_summary text,
  created_at timestamptz default now()
);

-- Triggers
create trigger set_timestamp_budgets
before update on budgets
for each row execute procedure update_modified_column();

create trigger set_timestamp_templates
before update on budget_templates
for each row execute procedure update_modified_column();

create trigger set_timestamp_categories
before update on budget_categories
for each row execute procedure update_modified_column();

create trigger set_timestamp_items
before update on budget_items
for each row execute procedure update_modified_column();

create trigger set_timestamp_shared
before update on shared_budgets
for each row execute procedure update_modified_column();

create trigger set_timestamp_scenarios
before update on budget_scenarios
for each row execute procedure update_modified_column();

create trigger set_timestamp_adjustments
before update on budget_adjustments
for each row execute procedure update_modified_column();

-- RLS (Row-Level Security)
alter table budgets enable row level security;
alter table budget_categories enable row level security;
alter table budget_items enable row level security;
alter table shared_budgets enable row level security;
alter table budget_scenarios enable row level security;
alter table budget_adjustments enable row level security;

create policy "Allow user access to own budgets"
  on budgets for all
  using (auth.uid() = user_id);

create policy "Allow collaborators on shared budgets"
  on shared_budgets for all
  using (auth.uid() = user_id);

create policy "Allow user access to own categories"
  on budget_categories for all
  using (
    auth.uid() = (select user_id from budgets where id = budget_categories.budget_id)
  );

create policy "Allow user access to own items"
  on budget_items for all
  using (
    auth.uid() = (select user_id from budgets b
                 join budget_categories c on c.budget_id = b.id
                 where c.id = budget_items.category_id)
  );

create policy "Allow user access to own scenarios"
  on budget_scenarios for all
  using (
    auth.uid() = (select user_id from budgets where id = budget_scenarios.budget_id)
  );

create policy "Allow user access to own adjustments"
  on budget_adjustments for all
  using (
    auth.uid() = (select user_id from budgets b
                 join budget_categories c on c.budget_id = b.id
                 join budget_items i on i.category_id = c.id
                 where i.id = budget_adjustments.item_id)
  );

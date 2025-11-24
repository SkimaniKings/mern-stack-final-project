-- ================================================
-- Goal-based Financial Planning 🎯 - Full Schema
-- ================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ENUMs
do $$
begin
  if not exists (select 1 from pg_type where typname = 'goal_status') then
    create type goal_status as enum ('active', 'paused', 'achieved', 'cancelled');
  end if;
end $$;

-- ================================================
-- Goals Table
-- ================================================

create table if not exists financial_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  description text,
  image_url text,
  target_amount numeric(14, 2) not null check (target_amount >= 0),
  current_amount numeric(14, 2) default 0 check (current_amount >= 0),
  currency text default 'USD',
  status goal_status default 'active',
  priority int default 1,
  start_date date default current_date,
  end_date date,
  category text default 'emergency',
  progress numeric(5,2) generated always as (
    case
      when target_amount = 0 then 0
      else round((current_amount / target_amount) * 100, 2)
    end
  ) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- Milestones Table
-- ================================================

create table if not exists goal_milestones (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid not null references financial_goals(id) on delete cascade,
  name text not null,
  description text,
  target_amount numeric(14,2) not null,
  is_achieved boolean default false,
  achieved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- Contributions Table
-- ================================================

create table if not exists goal_contributions (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid not null references financial_goals(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  contribution_date date default current_date,
  note text,
  created_at timestamptz default now()
);

-- ================================================
-- Goal Templates Table
-- ================================================

create table if not exists goal_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  recommended_monthly_saving numeric(14,2),
  duration_months int,
  default_image_url text,
  created_at timestamptz default now()
);

-- Optional use: copy templates into financial_goals for user customization

-- ================================================
-- Goal Round-up Automation Structure
-- ================================================

create table if not exists goal_roundups (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  goal_id uuid not null references financial_goals(id) on delete cascade,
  is_enabled boolean default true,
  roundup_type text default 'nearest_dollar', -- nearest_dollar, fixed_amount, percentage
  fixed_amount numeric(14,2),
  percentage numeric(5,2),
  created_at timestamptz default now()
);

-- ================================================
-- Triggers: Update Progress & Modified Timestamp
-- ================================================

-- Update progress after contribution
create or replace function update_goal_progress()
returns trigger as $$
begin
  update financial_goals
  set current_amount = current_amount + new.amount,
      updated_at = current_timestamp
  where id = new.goal_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_goal_progress on goal_contributions;

create trigger trg_update_goal_progress
after insert on goal_contributions
for each row execute procedure update_goal_progress();

-- Update modified_at
create or replace function update_modified_column()
returns trigger as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$ language plpgsql;

-- Apply triggers
create trigger trg_goal_update
before update on financial_goals
for each row execute procedure update_modified_column();

create trigger trg_milestone_update
before update on goal_milestones
for each row execute procedure update_modified_column();

-- ================================================
-- RLS Policies
-- ================================================

alter table financial_goals enable row level security;
alter table goal_milestones enable row level security;
alter table goal_contributions enable row level security;
alter table goal_roundups enable row level security;

-- Goals RLS
create policy "Users can manage their own goals"
on financial_goals for all
using (auth.uid() = user_id);

-- Milestones RLS
create policy "Users can manage their own milestones"
on goal_milestones for all
using (
  goal_id in (select id from financial_goals where user_id = auth.uid())
);

-- Contributions RLS
create policy "Users can manage their own contributions"
on goal_contributions for all
using (user_id = auth.uid());

-- Round-ups RLS
create policy "Users can manage their own roundups"
on goal_roundups for all
using (user_id = auth.uid());

-- ================================================
-- Indexes
-- ================================================

create index if not exists idx_goals_user_id on financial_goals(user_id);
create index if not exists idx_milestones_goal_id on goal_milestones(goal_id);
create index if not exists idx_contributions_goal_id on goal_contributions(goal_id);
create index if not exists idx_roundups_user_goal on goal_roundups(user_id, goal_id);

-- ================================================
-- Views
-- ================================================

create or replace view user_goal_summary as
select
  g.user_id,
  g.id as goal_id,
  g.name,
  g.description,
  g.target_amount,
  g.current_amount,
  g.progress,
  g.status,
  g.priority,
  count(m.id) filter (where m.is_achieved) as milestones_completed,
  count(m.id) as total_milestones
from financial_goals g
left join goal_milestones m on g.id = m.goal_id
group by g.user_id, g.id;


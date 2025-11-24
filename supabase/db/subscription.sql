-- ====================================================
-- Intelligent Subscription Management 📅 (Standalone)
-- ====================================================

-- ENUMs
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_frequency') then
    create type subscription_frequency as enum (
      'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annual', 'annual'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('active', 'paused', 'cancelled');
  end if;
end $$;

-- ================================================
-- Subscription Categories
-- ================================================

create table if not exists subscription_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  icon text,
  created_at timestamptz default now()
);

-- Seed common categories
insert into subscription_categories (name, description)
values
  ('Streaming', 'Video or music platforms'),
  ('Software', 'Apps or digital tools'),
  ('News & Media', 'Online publications or magazines'),
  ('Fitness', 'Gyms, apps, fitness plans'),
  ('Education', 'Online courses or learning platforms')
on conflict do nothing;

-- ================================================
-- Subscriptions Table
-- ================================================

create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  vendor text,
  description text,
  category_id uuid references subscription_categories(id),
  amount numeric(14,2) not null check (amount >= 0),
  currency text default 'USD',
  frequency subscription_frequency not null default 'monthly',
  next_renewal_date date not null,
  auto_renew boolean default true,
  status subscription_status default 'active',
  usage_rating int check (usage_rating between 0 and 10), -- ROI calc
  notes text,
  last_renewed_at date,
  cancel_url text,
  support_contact text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ================================================
-- Subscription Usage Logs (for ROI & patterns)
-- ================================================

create table if not exists subscription_usage_logs (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  used_on date not null,
  note text,
  created_at timestamptz default now()
);

-- ================================================
-- Subscription Price Change Alerts
-- ================================================

create table if not exists subscription_price_changes (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  old_amount numeric(14,2) not null,
  new_amount numeric(14,2) not null,
  changed_at timestamptz default now(),
  reason text
);

-- ================================================
-- Duplicate Subscription Detection View
-- ================================================

create view potential_duplicate_subscriptions as
select
  user_id,
  vendor,
  array_agg(id) as subscription_ids,
  count(*) as duplicate_count
from subscriptions
group by user_id, vendor
having count(*) > 1;

-- ================================================
-- Trigger: Track Subscription Renewals
-- ================================================

create or replace function update_subscription_on_renewal()
returns trigger as $$
begin
  update subscriptions
  set
    last_renewed_at = new.used_on,
    next_renewal_date = (
      case (select frequency from subscriptions where id = new.subscription_id)
        when 'weekly' then new.used_on + interval '7 days'
        when 'bi_weekly' then new.used_on + interval '14 days'
        when 'monthly' then new.used_on + interval '1 month'
        when 'quarterly' then new.used_on + interval '3 months'
        when 'semi_annual' then new.used_on + interval '6 months'
        when 'annual' then new.used_on + interval '1 year'
        else null
      end
    ),
    updated_at = current_timestamp
  where id = new.subscription_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_subscription_usage_update on subscription_usage_logs;

create trigger trg_subscription_usage_update
after insert on subscription_usage_logs
for each row execute procedure update_subscription_on_renewal();

-- ================================================
-- Trigger: Track Price Changes
-- ================================================

create or replace function track_subscription_price_change()
returns trigger as $$
begin
  if new.amount <> old.amount then
    insert into subscription_price_changes (
      subscription_id, old_amount, new_amount
    ) values (
      new.id, old.amount, new.amount
    );
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_track_subscription_price_change on subscriptions;

create trigger trg_track_subscription_price_change
before update on subscriptions
for each row when (old.amount is distinct from new.amount)
execute procedure track_subscription_price_change();

-- ================================================
-- RLS: Secure per-user access
-- ================================================

alter table subscriptions enable row level security;
alter table subscription_usage_logs enable row level security;
alter table subscription_price_changes enable row level security;

create policy "Users can manage their own subscriptions"
on subscriptions for all using (user_id = auth.uid());

create policy "Users can manage their usage logs"
on subscription_usage_logs for all using (user_id = auth.uid());

create policy "Users can see their price changes"
on subscription_price_changes for select using (
  subscription_id in (select id from subscriptions where user_id = auth.uid())
);

-- ================================================
-- Indexes
-- ================================================

create index if not exists idx_subscriptions_user on subscriptions(user_id);
create index if not exists idx_subscriptions_renewal on subscriptions(next_renewal_date);
create index if not exists idx_subscription_usage_logs_user on subscription_usage_logs(user_id);
create index if not exists idx_subscription_price_changes_sub on subscription_price_changes(subscription_id);

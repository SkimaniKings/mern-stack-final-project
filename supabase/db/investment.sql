-- ===============================================
-- ENUMs
-- ===============================================
create type asset_class as enum (
  'stocks', 'bonds', 'crypto', 'real_estate', 'commodities', 'cash', 'collectibles', 'private_equity', 'etf', 'mutual_fund'
);

-- ===============================================
-- TABLES
-- ===============================================
create table if not exists investment_portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  base_currency text default 'USD',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  target_allocation jsonb default '{}', -- e.g. {"stocks": 60, "bonds": 30, "crypto": 10}
  constraint portfolio_user_unique unique(user_id, name)
);

create table if not exists investment_holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references investment_portfolios(id) on delete cascade,
  symbol text not null,
  name text,
  asset_class asset_class not null,
  units numeric not null check (units >= 0),
  purchase_price numeric not null check (purchase_price >= 0),
  current_price numeric,
  currency text default 'USD',
  acquired_at date not null,
  sold_at date,
  status text default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ===============================================
-- Tax Lots for Gain/Loss Reporting
-- ===============================================
create table if not exists investment_tax_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  symbol text,
  units numeric,
  purchase_price numeric,
  sold_price numeric,
  acquired_at date,
  sold_at date,
  short_term boolean,
  portfolio_id uuid references investment_portfolios(id),
  created_at timestamp with time zone default now()
);

-- ===============================================
-- External Assets for Syncing Data (e.g. Finnhub)
-- ===============================================
create table if not exists external_assets (
  id uuid primary key default gen_random_uuid(),
  symbol text unique,
  provider text default 'finnhub',
  metadata jsonb,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- ===============================================
-- Function: Call External Asset Update (Finnhub)
-- ===============================================
create or replace function call_external_asset_update(symbol text, provider text default 'finnhub')
returns void as $$
begin
  perform
    net.http_post(
      url := 'https://your-supabase-functions-url/sync-asset',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('symbol', symbol, 'provider', provider)
    );
end;
$$ language plpgsql security definer;

comment on function call_external_asset_update is 'Triggers external sync of asset data from provider like Finnhub.';

-- ===============================================
-- Views
-- ===============================================
-- View: Portfolio Allocation with Targets
create or replace view investment_allocation_analysis as
select
  p.id as portfolio_id,
  p.name as portfolio_name,
  h.asset_class,
  sum(h.units * h.current_price) as asset_value,
  coalesce((
    select value::numeric
    from jsonb_each_text(p.target_allocation) as j(key, value)
    where key = h.asset_class::text
    limit 1
  ), 0) as target_percent
from investment_holdings h
join investment_portfolios p on p.id = h.portfolio_id
where h.status = 'active'
group by p.id, p.name, h.asset_class, p.target_allocation;

-- View: Annual Tax Report
create or replace view annual_tax_report as
select
  u.id as user_id,
  u.email,
  extract(year from t.sold_at) as tax_year,
  case when t.short_term then 'short_term' else 'long_term' end as gain_type,
  sum((t.sold_price - t.purchase_price) * t.units) as gain_loss,
  sum(t.units) as total_units,
  min(t.acquired_at) as first_acquired,
  max(t.sold_at) as last_sold
from investment_tax_lots t
join auth.users u on u.id = t.user_id
group by u.id, u.email, tax_year, gain_type;

-- View: Portfolio Snapshot Export
create or replace view investment_snapshot_export as
select
  p.id as portfolio_id,
  p.name as portfolio_name,
  h.symbol,
  h.name as asset_name,
  h.asset_class,
  h.units,
  h.purchase_price,
  h.current_price,
  h.currency,
  h.acquired_at,
  h.sold_at,
  (h.current_price - h.purchase_price) * h.units as unrealized_gain,
  h.status
from investment_holdings h
join investment_portfolios p on p.id = h.portfolio_id
where h.status = 'active';

-- ===============================================
-- Rebalancing Portfolio Suggestions View
-- ===============================================
create or replace view portfolio_rebalancing_suggestions as
select
  p.id as portfolio_id,
  p.user_id,
  h.asset_class,
  sum(h.units * h.current_price) as current_value,
  (p.target_allocation ->> (h.asset_class::text))::numeric as target_percent,
  (
    sum(h.units * h.current_price) * 100.0 / nullif(sum(sum(h.units * h.current_price)) over (partition by p.id), 0)
  ) as actual_percent,
  (
    ((p.target_allocation ->> (h.asset_class::text))::numeric / 100) *
    sum(sum(h.units * h.current_price)) over (partition by p.id)
    - sum(h.units * h.current_price)
  ) as adjustment_needed
from investment_portfolios p
join investment_holdings h on h.portfolio_id = p.id
group by p.id, p.user_id, h.asset_class, p.target_allocation;

-- ===============================================
-- Indexes and Optimizations
-- ===============================================
create index if not exists idx_holdings_portfolio_id on investment_holdings(portfolio_id);
create index if not exists idx_holdings_asset_class on investment_holdings(asset_class);
create index if not exists idx_taxlots_user_id on investment_tax_lots(user_id);
create index if not exists idx_external_assets_symbol on external_assets(symbol);

-- ===============================================
-- Security Notes
-- ===============================================
-- RLS and grants not included — should be added based on your Supabase policy setup.

-- ===============================================
-- Function: Sync Asset from Finnhub (Triggered Sync)
-- ===============================================
create or replace function sync_asset_from_finnhub(symbol text)
returns void
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://<your-edge-function-url>/sync-finnhub',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('symbol', symbol)
  );
end;
$$;

comment on function sync_asset_from_finnhub is 'Triggers a sync of asset data from Finnhub for a given symbol.';

-- ===============================================
-- Add missing columns to investments table
-- ===============================================
-- This addresses the error: "Could not find the 'cost_basis' column of 'investments' in the schema cache"

-- First, check if the investments table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investments') THEN
    -- Add cost_basis column (required by the application)
    ALTER TABLE IF EXISTS investments 
    ADD COLUMN IF NOT EXISTS cost_basis numeric DEFAULT 0;

    -- Add other columns used in the add-investment.ts file
    ALTER TABLE IF EXISTS investments 
    ADD COLUMN IF NOT EXISTS ticker text;

    ALTER TABLE IF EXISTS investments 
    ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

    ALTER TABLE IF EXISTS investments 
    ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

    ALTER TABLE IF EXISTS investments 
    ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

    ALTER TABLE IF EXISTS investments 
    ADD COLUMN IF NOT EXISTS quantity numeric;

    ALTER TABLE IF EXISTS investments 
    ADD COLUMN IF NOT EXISTS initial_price numeric;

    ALTER TABLE IF EXISTS investments 
    ADD COLUMN IF NOT EXISTS current_price numeric;

    -- Add updated_at trigger if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'trg_update_investments_updated'
    ) THEN
      CREATE TRIGGER trg_update_investments_updated
      BEFORE UPDATE ON investments
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    END IF;

    -- Comment on the table
    COMMENT ON TABLE investments IS 'Stores user investment data with enhanced fields for tracking performance';
  END IF;
END $$;

-- Create the watchlist table
create table if not exists public.watchlist (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    name text not null,
    ticker text,
    price numeric,
    target_price numeric,
    notes text,
    sector text,
    price_alert_enabled boolean default false,
    alert_threshold numeric,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Optional: create index for faster queries by user
create index if not exists idx_watchlist_user_id on public.watchlist(user_id);
-- ==========================================
-- EXTENSIONS
-- ==========================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==========================================
-- USERS TABLE (EXTENDED FROM auth.users)
-- ==========================================
create table public.users (
  -- 🔐 Primary Key from Supabase Auth
  id uuid primary key references auth.users(id) on delete cascade,

  -- 📛 Identity & Profile
  username text unique not null check (char_length(username) >= 3),
  full_name text,
  email text unique,
  phone text unique,
  avatar_url text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'non-binary', 'other', 'prefer not to say')),

  -- 🔐 Security & Auth Metadata
  is_email_verified boolean default false,
  mfa_enabled boolean default false,
  mfa_type text,
  is_biometrics_enabled boolean default false,
  biometric_type text,
  suspicious_login_flag boolean default false,
  last_login_at timestamptz,
  session_timeout_minutes integer default 30 check (session_timeout_minutes >= 5),

  -- 🚨 Emergency Access
  emergency_access_enabled boolean default false,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,

  -- 🔏 Privacy & Consent
  has_consented boolean default false,
  consent_updated_at timestamptz,
  privacy_level text default 'standard' check (privacy_level in ('standard', 'strict', 'paranoid')),
  local_data_only boolean default false,
  allow_data_analysis boolean default true,
  data_retention_policy text default '1y',

  -- 🌐 Localization & Preferences
  locale text default 'en-US',
  currency_code char(3) default 'USD',
  timezone text default 'UTC',
  theme text default 'system' check (theme in ('light', 'dark', 'system')),
  date_format text default 'YYYY-MM-DD',
  notification_preferences jsonb default '{}'::jsonb,

  -- 🎓 Onboarding
  onboarding_completed boolean default false,
  onboarding_step text,

  -- 🛡️ Roles & Access Control
  user_role text default 'user' check (user_role in ('user', 'admin', 'coach', 'viewer')),
  permission_scope jsonb default '{}'::jsonb,

  -- 🧾 Audit Fields
  created_at timestamptz default current_timestamp,
  updated_at timestamptz default current_timestamp,
  deleted_at timestamptz,

  -- 🔍 Metadata
  referral_code text,
  signup_source text,
  marketing_opt_in boolean default false,
  last_active_at timestamptz,

  -- 🔒 Constraints
  constraint chk_valid_email check (position('@' in email) > 1),
  constraint username_unique unique(username),
  constraint email_unique unique(email)
);

-- ==========================================
-- AUTO UPDATE updated_at FIELD
-- ==========================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_updated_at
before update on public.users
for each row
execute procedure update_updated_at();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
alter table public.users enable row level security;

create policy "Users can manage their own user row"
on public.users
for all
using (auth.uid() = id);

-- Optional Admin Policy (commented out by default)
-- create policy "Admins can read all users"
-- on public.users
-- for select
-- using (exists (
--   select 1 from public.users as u where u.id = auth.uid() and u.user_role = 'admin'
-- ));

-- ==========================================
-- EMAIL SYNC TRIGGER FROM auth.users
-- ==========================================
create or replace function sync_user_email()
returns trigger as $$
begin
  update public.users
  set email = new.email
  where id = new.id;
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_email
after update of email on auth.users
for each row
execute procedure sync_user_email();

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
create index idx_users_email on public.users(email);
create index idx_users_username on public.users(username);
create index idx_users_role on public.users(user_role);
create index idx_users_created_at on public.users(created_at);

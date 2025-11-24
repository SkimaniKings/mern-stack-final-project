-- ========================================
-- TRANSACTIONS TABLE WITH NOTES SUPPORT
-- ========================================

-- Base transactions table
create table if not exists transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    account_id uuid references accounts(id) on delete set null,
    transaction_date timestamptz not null default now(),
    type text not null check (type in ('income', 'expense', 'transfer', 'goal', 'investment', 'bill')),
    amount numeric not null,
    currency text default 'USD',
    note text,
    note_search tsvector,
    tags text[],
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Trigger function for automatic updated_at
create or replace function update_transactions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at column
create trigger trg_update_transactions_updated
before update on transactions
for each row
execute procedure update_transactions_updated_at();

-- ========================================
-- FULL-TEXT SEARCH SUPPORT FOR NOTES
-- ========================================

-- Function to update the tsvector column
create or replace function update_transaction_note_search()
returns trigger as $$
begin
  new.note_search := to_tsvector('english', coalesce(new.note, ''));
  return new;
end;
$$ language plpgsql;

-- Trigger to maintain the full-text index
create trigger trg_note_search
before insert or update on transactions
for each row
execute procedure update_transaction_note_search();

-- Index for fast full-text search
create index if not exists idx_transactions_note_search
on transactions using gin(note_search);

-- ========================================
-- SEARCH AND ANALYTICS VIEWS
-- ========================================

-- View to highlight matches in notes using ts_headline
create or replace view transaction_note_search_view as select
  id,
  user_id, 
  transaction_date, 
  type, 
  amount, 
  note,
  ts_headline('english', note, to_tsquery('english', 'financial:')) as highlighted_note
from transactions where note_search @@ to_tsquery('english', 'financial:');

-- View for most common keywords in notes
create or replace view top_transaction_note_keywords as
select
  user_id,
  keyword,
  count(*) as transaction_count,
  sum(amount) as total_amount
from (
  select
    user_id,
    unnest(string_to_array(lower(regexp_replace(note, '[^\w\s]', '', 'g')), ' ')) as keyword,
    amount
  from transactions
  where note is not null and length(note) > 0
) words
where keyword <> ''
group by user_id, keyword
order by total_amount desc;

-- ========================================
-- END OF TRANSACTIONS + NOTES
-- ========================================

-- ========================================
-- ACCOUNT BALANCE MANAGEMENT
-- ========================================

-- Function to update account balance
create or replace function update_account_balance(p_account_id uuid, p_amount numeric)
returns void as $$
begin
  -- Update the account balance
  update accounts
  set balance = balance + p_amount
  where id = p_account_id;
  
  -- Record the balance change in history
  insert into account_balance_history (
    account_id,
    user_id,
    balance,
    change_type,
    note
  )
  select
    p_account_id,
    user_id,
    balance,
    case when p_amount > 0 then 'income' else 'expense' end,
    'Balance updated via transaction'
  from accounts
  where id = p_account_id;
  
  -- Return success
  return;
end;
$$ language plpgsql;

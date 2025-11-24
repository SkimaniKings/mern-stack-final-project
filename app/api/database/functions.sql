-- SQL functions to manage the watchlist table schema

-- Function to check if all required columns exist in the watchlist table
CREATE OR REPLACE FUNCTION check_watchlist_columns()
RETURNS void AS $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if alert_threshold column exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'watchlist'
        AND column_name = 'alert_threshold'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE EXCEPTION 'alert_threshold column does not exist in watchlist table';
    END IF;
    
    -- Check if price_alert_enabled column exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'watchlist'
        AND column_name = 'price_alert_enabled'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE EXCEPTION 'price_alert_enabled column does not exist in watchlist table';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to add missing columns to the watchlist table
CREATE OR REPLACE FUNCTION add_missing_watchlist_columns()
RETURNS void AS $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Add alert_threshold column if it doesn't exist
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'watchlist'
        AND column_name = 'alert_threshold'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        EXECUTE 'ALTER TABLE watchlist ADD COLUMN alert_threshold NUMERIC';
    END IF;
    
    -- Add price_alert_enabled column if it doesn't exist
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'watchlist'
        AND column_name = 'price_alert_enabled'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        EXECUTE 'ALTER TABLE watchlist ADD COLUMN price_alert_enabled BOOLEAN DEFAULT FALSE';
    END IF;
    
    -- Add price_alerts column for backward compatibility if it doesn't exist
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'watchlist'
        AND column_name = 'price_alerts'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        EXECUTE 'ALTER TABLE watchlist ADD COLUMN price_alerts BOOLEAN DEFAULT FALSE';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create the watchlist table if it doesn't exist
CREATE OR REPLACE FUNCTION create_watchlist_table()
RETURNS void AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS watchlist (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        ticker TEXT NOT NULL,
        name TEXT NOT NULL,
        price NUMERIC,
        target_price NUMERIC,
        notes TEXT,
        sector TEXT,
        price_alert_enabled BOOLEAN DEFAULT FALSE,
        price_alerts BOOLEAN DEFAULT FALSE,
        alert_threshold NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to insert a watchlist item with RLS bypass
CREATE OR REPLACE FUNCTION insert_watchlist_item_bypass_rls(item_data JSONB)
RETURNS SETOF watchlist AS $$
DECLARE
    new_item watchlist;
BEGIN
    INSERT INTO watchlist (
        id, 
        user_id, 
        ticker, 
        name, 
        price, 
        target_price, 
        notes, 
        sector, 
        price_alert_enabled, 
        price_alerts,
        alert_threshold, 
        created_at, 
        updated_at
    ) VALUES (
        (item_data->>'id')::UUID,
        (item_data->>'user_id')::UUID,
        item_data->>'ticker',
        item_data->>'name',
        (item_data->>'price')::NUMERIC,
        (item_data->>'target_price')::NUMERIC,
        item_data->>'notes',
        item_data->>'sector',
        (item_data->>'price_alert_enabled')::BOOLEAN,
        (item_data->>'price_alert_enabled')::BOOLEAN, -- Use same value for both fields
        (item_data->>'alert_threshold')::NUMERIC,
        (item_data->>'created_at')::TIMESTAMP WITH TIME ZONE,
        (item_data->>'updated_at')::TIMESTAMP WITH TIME ZONE
    )
    RETURNING * INTO new_item;
    
    RETURN NEXT new_item;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

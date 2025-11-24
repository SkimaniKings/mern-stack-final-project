-- Function to refresh the PostgREST schema cache
CREATE OR REPLACE FUNCTION refresh_postgrest_schema()
RETURNS void AS $$
BEGIN
    -- Ensure all required columns exist
    BEGIN
        -- Add alert_threshold column if it doesn't exist
        ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS alert_threshold NUMERIC;
        
        -- Add price column if it doesn't exist
        ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS price NUMERIC;
        
        -- Add target_price column if it doesn't exist
        ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS target_price NUMERIC;
        
        -- Add notes column if it doesn't exist
        ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS notes TEXT;
        
        -- Add sector column if it doesn't exist
        ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS sector TEXT;
        
        -- Add price_alert_enabled column if it doesn't exist
        ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS price_alert_enabled BOOLEAN DEFAULT FALSE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error adding columns: %', SQLERRM;
    END;
    
    -- Then notify PostgREST to refresh its schema cache
    NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

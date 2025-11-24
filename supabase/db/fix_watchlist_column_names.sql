-- Fix watchlist table column names to ensure consistency
-- This migration renames price_alerts to price_alert_enabled to match the code

DO $$
BEGIN
    -- Check if the watchlist table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'watchlist') THEN
        -- Check if price_alerts column exists
        IF EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'watchlist' 
                  AND column_name = 'price_alerts') THEN
            
            -- Rename the column to match the code
            ALTER TABLE public.watchlist 
            RENAME COLUMN price_alerts TO price_alert_enabled;
            
            RAISE NOTICE 'Renamed price_alerts column to price_alert_enabled';
        ELSIF NOT EXISTS (SELECT FROM information_schema.columns 
                         WHERE table_schema = 'public' 
                         AND table_name = 'watchlist' 
                         AND column_name = 'price_alert_enabled') THEN
            
            -- If neither column exists, add the correct one
            ALTER TABLE public.watchlist 
            ADD COLUMN price_alert_enabled BOOLEAN DEFAULT FALSE;
            
            RAISE NOTICE 'Added price_alert_enabled column';
        ELSE
            RAISE NOTICE 'price_alert_enabled column already exists, no changes needed';
        END IF;
        
        -- Refresh the schema cache to ensure the column is recognized
        NOTIFY pgrst, 'reload schema';
        
    ELSE
        RAISE NOTICE 'Watchlist table does not exist';
    END IF;
END
$$;

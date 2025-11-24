-- Update watchlist table to add real-time data fields and price alert functionality
-- This migration adds fields for storing real-time market data and enhanced price alert features

-- First check if the watchlist table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'watchlist') THEN
        -- Add new columns for real-time data if they don't exist
        BEGIN
            ALTER TABLE public.watchlist 
            ADD COLUMN IF NOT EXISTS previous_close DECIMAL(15, 2),
            ADD COLUMN IF NOT EXISTS price_change DECIMAL(15, 2),
            ADD COLUMN IF NOT EXISTS price_change_percent DECIMAL(15, 2),
            ADD COLUMN IF NOT EXISTS day_high DECIMAL(15, 2),
            ADD COLUMN IF NOT EXISTS day_low DECIMAL(15, 2),
            ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS alert_triggered BOOLEAN DEFAULT FALSE;
            
            RAISE NOTICE 'Watchlist table updated with real-time data fields';
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Error updating watchlist table: %', SQLERRM;
        END;
    ELSE
        -- Create the watchlist table if it doesn't exist
        CREATE TABLE public.watchlist (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL,
            ticker TEXT NOT NULL,
            name TEXT NOT NULL,
            price DECIMAL(15, 2) NOT NULL DEFAULT 0,
            target_price DECIMAL(15, 2),
            notes TEXT,
            sector TEXT,
            price_alerts BOOLEAN DEFAULT FALSE,
            alert_threshold DECIMAL(15, 2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            previous_close DECIMAL(15, 2),
            price_change DECIMAL(15, 2),
            price_change_percent DECIMAL(15, 2),
            day_high DECIMAL(15, 2),
            day_low DECIMAL(15, 2),
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
            alert_triggered BOOLEAN DEFAULT FALSE
        );
        
        -- Add indexes for better performance
        CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON public.watchlist (user_id);
        CREATE INDEX IF NOT EXISTS watchlist_ticker_idx ON public.watchlist (ticker);
        
        -- Add row level security policies
        ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for select
        CREATE POLICY watchlist_select_policy ON public.watchlist
            FOR SELECT USING (auth.uid() = user_id);
            
        -- Create policy for insert
        CREATE POLICY watchlist_insert_policy ON public.watchlist
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        -- Create policy for update
        CREATE POLICY watchlist_update_policy ON public.watchlist
            FOR UPDATE USING (auth.uid() = user_id);
            
        -- Create policy for delete
        CREATE POLICY watchlist_delete_policy ON public.watchlist
            FOR DELETE USING (auth.uid() = user_id);
            
        RAISE NOTICE 'Watchlist table created with real-time data fields';
    END IF;
END
$$;

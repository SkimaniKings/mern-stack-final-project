-- Function to fix watchlist table issues
CREATE OR REPLACE FUNCTION fix_watchlist_issues()
RETURNS void AS $$
BEGIN
    -- 1. Ensure the default user exists in public.users table
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000000') THEN
        BEGIN
            INSERT INTO public.users (id, email, created_at, updated_at)
            VALUES (
                '00000000-0000-0000-0000-000000000000',
                'default@example.com',
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Default user created in public.users table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error creating default user in public.users: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Default user already exists in public.users';
    END IF;
    
    -- 2. Ensure the user from the error message exists in public.users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '168c33ab-6db4-494c-8da4-2b9e92a43e81') THEN
        BEGIN
            INSERT INTO public.users (id, email, created_at, updated_at)
            VALUES (
                '168c33ab-6db4-494c-8da4-2b9e92a43e81',
                'user-168c33ab@example.com',
                NOW(),
                NOW()
            );
            RAISE NOTICE 'User 168c33ab-6db4-494c-8da4-2b9e92a43e81 created in public.users table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error creating user 168c33ab-6db4-494c-8da4-2b9e92a43e81: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'User 168c33ab-6db4-494c-8da4-2b9e92a43e81 already exists in public.users';
    END IF;
    
    -- 3. Ensure the watchlist table has all required columns
    BEGIN
        -- Add alert_threshold column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'watchlist' 
                      AND column_name = 'alert_threshold') THEN
            
            ALTER TABLE public.watchlist 
            ADD COLUMN alert_threshold NUMERIC;
            
            RAISE NOTICE 'Added alert_threshold column';
        ELSE
            RAISE NOTICE 'alert_threshold column already exists';
        END IF;
        
        -- Add price_alert_enabled column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'watchlist' 
                      AND column_name = 'price_alert_enabled') THEN
            
            ALTER TABLE public.watchlist 
            ADD COLUMN price_alert_enabled BOOLEAN DEFAULT FALSE;
            
            RAISE NOTICE 'Added price_alert_enabled column';
        ELSE
            RAISE NOTICE 'price_alert_enabled column already exists';
        END IF;
        
        -- If price_alerts column exists but price_alert_enabled doesn't, copy data
        IF EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'watchlist' 
                  AND column_name = 'price_alerts') THEN
            
            -- Update price_alert_enabled with values from price_alerts
            UPDATE public.watchlist
            SET price_alert_enabled = price_alerts
            WHERE price_alert_enabled IS NULL AND price_alerts IS NOT NULL;
            
            RAISE NOTICE 'Copied data from price_alerts to price_alert_enabled';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error fixing columns: %', SQLERRM;
    END;
    
    -- 4. Notify PostgREST to refresh its schema cache
    NOTIFY pgrst, 'reload schema';
    RAISE NOTICE 'Sent notification to refresh PostgREST schema cache';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Helper function to create a Supabase client
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials are not properly configured")
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  })
}

// GET endpoint to fix the watchlist schema
export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client
    const supabase = createSupabaseClient()
    
    // SQL to fix the watchlist schema
    const sql = `
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
    `
    
    // Execute the SQL directly
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: sql
    })
    
    if (error) {
      console.error("Error fixing watchlist schema:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to fix watchlist schema: " + error.message 
      }, { status: 500 })
    }
    
    // Also run a simple query to refresh the schema cache
    await supabase.from('watchlist').select('id').limit(1)
    
    return NextResponse.json({ 
      success: true, 
      message: "Watchlist schema fixed successfully" 
    })
  } catch (error) {
    console.error("Error fixing watchlist schema:", error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}

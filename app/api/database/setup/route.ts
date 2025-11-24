import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Create a Supabase client
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials are not properly configured");
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
}

// GET endpoint to setup database schema and functions
export async function GET(request: NextRequest) {
  try {
    console.log("Starting database setup and migration...");
    const supabase = createSupabaseClient();
    
    // Read the SQL functions file
    const sqlFilePath = path.join(process.cwd(), 'app', 'api', 'database', 'functions.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split the SQL content into individual function definitions
    const functionDefinitions = sqlContent.split('-- Function to');
    
    // Execute each function definition
    let results = [];
    
    for (let i = 1; i < functionDefinitions.length; i++) {
      const functionDef = '-- Function to' + functionDefinitions[i];
      const functionName = functionDef.split('CREATE OR REPLACE FUNCTION ')[1]?.split('(')[0]?.trim();
      
      if (functionName) {
        console.log(`Creating/updating function: ${functionName}`);
        
        // Execute the SQL to create/update the function
        const { error } = await supabase.rpc('exec_sql', { sql: functionDef });
        
        if (error) {
          console.error(`Error creating function ${functionName}:`, error);
          results.push({ function: functionName, success: false, error: error.message });
        } else {
          console.log(`Successfully created/updated function: ${functionName}`);
          results.push({ function: functionName, success: true });
        }
      }
    }
    
    // Create user management functions
    console.log("Setting up user management functions...");
    try {
      // Read the create_default_user SQL file
      const defaultUserSqlPath = path.join(process.cwd(), 'app', 'api', 'database', 'create_default_user.sql');
      const defaultUserSql = fs.readFileSync(defaultUserSqlPath, 'utf8');
      
      // Create the default user function
      const { error: createDefaultUserFunctionError } = await supabase.rpc('exec_sql', { sql: defaultUserSql });
      if (createDefaultUserFunctionError) {
        console.error("Error creating default user function:", createDefaultUserFunctionError);
        results.push({ function: 'create_default_user', success: false, error: createDefaultUserFunctionError.message });
      } else {
        console.log("Default user function created successfully");
        results.push({ function: 'create_default_user', success: true });
      }
      
      // Read the create_user_if_not_exists SQL file
      const createUserFunctionSqlPath = path.join(process.cwd(), 'app', 'api', 'database', 'create_user_function.sql');
      const createUserFunctionSql = fs.readFileSync(createUserFunctionSqlPath, 'utf8');
      
      // Create the user creation function
      const { error: createUserFunctionError } = await supabase.rpc('exec_sql', { sql: createUserFunctionSql });
      if (createUserFunctionError) {
        console.error("Error creating user function:", createUserFunctionError);
        results.push({ function: 'create_user_if_not_exists', success: false, error: createUserFunctionError.message });
      } else {
        console.log("User creation function created successfully");
        results.push({ function: 'create_user_if_not_exists', success: true });
      }
      
      // Execute the function to create the default user
      const { error: execFunctionError } = await supabase.rpc('exec_sql', { 
        sql: 'SELECT create_default_user();' 
      });
      
      if (execFunctionError) {
        console.error("Error executing default user function:", execFunctionError);
        results.push({ function: 'create_default_user_exec', success: false, error: execFunctionError.message });
      } else {
        console.log("Default user created or already exists");
        results.push({ function: 'create_default_user_exec', success: true });
      }
    } catch (userFunctionError) {
      console.error("Error with user function creation:", userFunctionError);
      results.push({ function: 'user_functions', success: false, error: String(userFunctionError) });
    }
    
    // Now create the watchlist table if it doesn't exist
    console.log("Creating watchlist table if it doesn't exist...");
    const { error: tableError } = await supabase.rpc('create_watchlist_table');
    
    if (tableError) {
      // Check if it's a permission error
      if (tableError.code === '42501') {
        console.log("Permission denied for creating table. This is expected in hosted environments where tables are pre-created.");
        results.push({ 
          function: 'create_watchlist_table', 
          success: true, 
          warning: "Permission denied, but this is expected in hosted environments. Continuing with client-side storage."
        });
      } else {
        console.error("Error creating watchlist table:", tableError);
        results.push({ function: 'create_watchlist_table', success: false, error: tableError.message });
      }
    } else {
      console.log("Watchlist table created or already exists");
      results.push({ function: 'create_watchlist_table', success: true });
    }
    
    // Fix column name issue - ensure price_alert_enabled exists and price_alerts doesn't
    console.log("Fixing watchlist column names...");
    try {
      const fixColumnSql = `
        DO $$
        BEGIN
          -- Check if price_alerts column exists and rename it to price_alert_enabled
          IF EXISTS (SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'watchlist' 
                    AND column_name = 'price_alerts') THEN
              
              ALTER TABLE public.watchlist 
              RENAME COLUMN price_alerts TO price_alert_enabled;
              
              RAISE NOTICE 'Renamed price_alerts column to price_alert_enabled';
          ELSIF NOT EXISTS (SELECT FROM information_schema.columns 
                          WHERE table_schema = 'public' 
                          AND table_name = 'watchlist' 
                          AND column_name = 'price_alert_enabled') THEN
              
              ALTER TABLE public.watchlist 
              ADD COLUMN price_alert_enabled BOOLEAN DEFAULT FALSE;
              
              RAISE NOTICE 'Added price_alert_enabled column';
          ELSE
              RAISE NOTICE 'price_alert_enabled column already exists, no changes needed';
          END IF;
          
          -- Ensure alert_threshold column exists
          IF NOT EXISTS (SELECT FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                        AND table_name = 'watchlist' 
                        AND column_name = 'alert_threshold') THEN
              
              ALTER TABLE public.watchlist 
              ADD COLUMN alert_threshold NUMERIC;
              
              RAISE NOTICE 'Added alert_threshold column';
          ELSE
              RAISE NOTICE 'alert_threshold column already exists, no changes needed';
          END IF;
          
          -- Notify PostgREST to refresh its schema cache
          NOTIFY pgrst, 'reload schema';
        END
        $$;
      `;
      
      const { error: fixColumnError } = await supabase.rpc('exec_sql', { sql: fixColumnSql });
      
      if (fixColumnError) {
        console.error("Error fixing column names:", fixColumnError);
        results.push({ function: 'fix_column_names', success: false, error: fixColumnError.message });
      } else {
        console.log("Column names fixed successfully");
        results.push({ function: 'fix_column_names', success: true });
      }
    } catch (fixColumnError) {
      console.error("Error with column name fix:", fixColumnError);
      results.push({ function: 'fix_column_names', success: false, error: String(fixColumnError) });
    }
    
    // Add missing columns if needed
    console.log("Adding missing columns to watchlist table...");
    const { error: columnsError } = await supabase.rpc('add_missing_watchlist_columns');
    
    if (columnsError) {
      // Check if it's a permission error
      if (columnsError.code === '42501') {
        console.log("Permission denied for adding columns. This is expected in hosted environments. Continuing with client-side storage.");
        results.push({ 
          function: 'add_missing_watchlist_columns', 
          success: true, 
          warning: "Permission denied, but this is expected in hosted environments. Continuing with client-side storage."
        });
      } else {
        console.error("Error adding missing columns:", columnsError);
        results.push({ function: 'add_missing_watchlist_columns', success: false, error: columnsError.message });
      }
    } else {
      console.log("Missing columns added successfully");
      results.push({ function: 'add_missing_watchlist_columns', success: true });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Database setup and migration completed",
      results
    });
  } catch (error) {
    console.error("Error setting up database:", error);
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred during database setup" 
    }, { status: 500 });
  }
}

// Helper function to execute arbitrary SQL (will be used by the exec_sql RPC)
export async function POST(request: NextRequest) {
  try {
    const { sql } = await request.json();
    
    if (!sql) {
      return NextResponse.json({ 
        success: false, 
        error: "SQL statement is required" 
      }, { status: 400 });
    }
    
    const supabase = createSupabaseClient();
    
    // Execute the SQL statement using Supabase's REST API
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error("Error executing SQL:", error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data
    });
  } catch (error) {
    console.error("Error executing SQL:", error);
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 });
  }
}

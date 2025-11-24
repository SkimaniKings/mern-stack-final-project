import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log("Starting subscription schema setup...");
    
    // Create a Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing Supabase credentials" 
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Load and execute our fix_subscription_issues function
    console.log("Loading and executing fix_subscription_issues function...");
    
    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const fixSubscriptionSqlPath = path.join(process.cwd(), 'app', 'api', 'database', 'fix_subscription_issues.sql');
    const fixSubscriptionSql = fs.readFileSync(fixSubscriptionSqlPath, 'utf8');
    
    // Create the subscription function
    const { error: createSubscriptionFunctionError } = await supabase.rpc('exec_sql', { sql: fixSubscriptionSql });
    
    if (createSubscriptionFunctionError) {
      console.error("Error creating fix_subscription_issues function:", createSubscriptionFunctionError);
    } else {
      console.log("Successfully created fix_subscription_issues function");
      
      // Execute the subscription function
      const { data: result, error: execSubscriptionFunctionError } = await supabase.rpc('exec_sql', { 
        sql: 'SELECT fix_subscription_issues();' 
      });
      
      if (execSubscriptionFunctionError) {
        console.error("Error executing fix_subscription_issues function:", execSubscriptionFunctionError);
      } else {
        console.log("Successfully executed fix_subscription_issues function", result);
      }
    }
    
    // Also directly add the category column using raw SQL as a backup
    console.log("Directly adding category column as backup...");
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add category column to subscriptions if it doesn't exist
        ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
        
        -- Refresh the schema cache
        NOTIFY pgrst, 'reload schema';
      `
    });
    
    if (sqlError) {
      console.error("Error executing direct SQL:", sqlError);
    } else {
      console.log("Successfully executed direct SQL");
    }
    
    const status = {
      success: true,
      message: 'Subscription system setup complete',
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Error in subscription setup:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message
    }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log("Starting schema refresh...");
    
    // Create a Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: "Missing Supabase URL or Service Role Key"
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // First, let's load and execute our fix_watchlist_issues function
    console.log("Loading and executing fix_watchlist_issues function...");
    
    // Read the SQL files
    const fs = require('fs');
    const path = require('path');
    const fixWatchlistSqlPath = path.join(process.cwd(), 'app', 'api', 'database', 'fix_watchlist_issues.sql');
    const fixWatchlistSql = fs.readFileSync(fixWatchlistSqlPath, 'utf8');
    
    // Create the watchlist function
    const { error: createWatchlistFunctionError } = await supabase.rpc('exec_sql', { sql: fixWatchlistSql });
    
    if (createWatchlistFunctionError) {
      console.error("Error creating fix_watchlist_issues function:", createWatchlistFunctionError);
    } else {
      console.log("Successfully created fix_watchlist_issues function");
      
      // Execute the watchlist function
      const { error: execWatchlistFunctionError } = await supabase.rpc('exec_sql', { 
        sql: 'SELECT fix_watchlist_issues();' 
      });
      
      if (execWatchlistFunctionError) {
        console.error("Error executing fix_watchlist_issues function:", execWatchlistFunctionError);
      } else {
        console.log("Successfully executed fix_watchlist_issues function");
      }
    }
    
    // Now load and execute our fix_debts_issues function
    console.log("Loading and executing fix_debts_issues function...");
    
    try {
      const fixDebtsSqlPath = path.join(process.cwd(), 'app', 'api', 'database', 'fix_debts_issues.sql');
      const fixDebtsSql = fs.readFileSync(fixDebtsSqlPath, 'utf8');
      
      // Create the debts functions
      const { error: createDebtsFunctionError } = await supabase.rpc('exec_sql', { sql: fixDebtsSql });
      
      if (createDebtsFunctionError) {
        console.error("Error creating debts functions:", createDebtsFunctionError);
      } else {
        console.log("Successfully created debts functions");
        
        // Execute the ensure_debts_columns_exist function
        const { error: execDebtsFunctionError } = await supabase.rpc('exec_sql', { 
          sql: 'SELECT ensure_debts_columns_exist();' 
        });
        
        if (execDebtsFunctionError) {
          console.error("Error executing ensure_debts_columns_exist function:", execDebtsFunctionError);
        } else {
          console.log("Successfully executed ensure_debts_columns_exist function");
        }
      }
    } catch (debtsSqlError) {
      console.error("Error loading or executing debts SQL:", debtsSqlError);
    }
    
    // Also directly add all required columns using raw SQL as a backup
    console.log("Directly adding all required columns as backup...");
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add all required columns to watchlist if they don't exist
        ALTER TABLE IF EXISTS public.watchlist ADD COLUMN IF NOT EXISTS alert_threshold NUMERIC;
        ALTER TABLE IF EXISTS public.watchlist ADD COLUMN IF NOT EXISTS price NUMERIC;
        ALTER TABLE IF EXISTS public.watchlist ADD COLUMN IF NOT EXISTS target_price NUMERIC;
        ALTER TABLE IF EXISTS public.watchlist ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE IF EXISTS public.watchlist ADD COLUMN IF NOT EXISTS sector TEXT;
        ALTER TABLE IF EXISTS public.watchlist ADD COLUMN IF NOT EXISTS price_alert_enabled BOOLEAN DEFAULT FALSE;
        
        -- Add all required columns to debts if they don't exist
        ALTER TABLE IF EXISTS public.debts ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'personal_loan';
        ALTER TABLE IF EXISTS public.debts ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0;
        ALTER TABLE IF EXISTS public.debts ADD COLUMN IF NOT EXISTS interest_rate NUMERIC DEFAULT 0;
        ALTER TABLE IF EXISTS public.debts ADD COLUMN IF NOT EXISTS minimum_payment NUMERIC DEFAULT 0;
        ALTER TABLE IF EXISTS public.debts ADD COLUMN IF NOT EXISTS loan_term INTEGER;

        -- Add all required columns to budgets if they don't exist
        ALTER TABLE IF EXISTS public.budgets ADD COLUMN IF NOT EXISTS amount NUMERIC NOT NULL DEFAULT 0;

        -- Add all required columns to budget_categories if they don't exist
        ALTER TABLE IF EXISTS public.budget_categories ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE IF EXISTS public.budget_categories ADD COLUMN IF NOT EXISTS amount_allocated NUMERIC;
        ALTER TABLE IF EXISTS public.budget_categories ADD COLUMN IF NOT EXISTS parent_category_id UUID;
        ALTER TABLE IF EXISTS public.budget_categories ADD COLUMN IF NOT EXISTS color TEXT;
        
        -- Add split expense columns to expenses table
        ALTER TABLE IF EXISTS public.expenses ADD COLUMN IF NOT EXISTS split_with_name TEXT;
        ALTER TABLE IF EXISTS public.expenses ADD COLUMN IF NOT EXISTS split_amount NUMERIC;
        
        -- Create expense_splits table if it doesn't exist
        CREATE TABLE IF NOT EXISTS public.expense_splits (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
          shared_with_name TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS on expense_splits
        ALTER TABLE IF EXISTS public.expense_splits ENABLE ROW LEVEL SECURITY;
        
        -- Create policies for expense_splits
        DROP POLICY IF EXISTS "Users can view their own expense splits" ON expense_splits;
        CREATE POLICY "Users can view their own expense splits"
          ON expense_splits
          FOR SELECT
          USING (expense_id IN (SELECT id FROM expenses WHERE user_id = auth.uid()));
          
        DROP POLICY IF EXISTS "Users can insert their own expense splits" ON expense_splits;
        CREATE POLICY "Users can insert their own expense splits"
          ON expense_splits
          FOR INSERT
          WITH CHECK (expense_id IN (SELECT id FROM expenses WHERE user_id = auth.uid()));
          
        DROP POLICY IF EXISTS "Users can update their own expense splits" ON expense_splits;
        CREATE POLICY "Users can update their own expense splits"
          ON expense_splits
          FOR UPDATE
          USING (expense_id IN (SELECT id FROM expenses WHERE user_id = auth.uid()));
          
        DROP POLICY IF EXISTS "Users can delete their own expense splits" ON expense_splits;
        CREATE POLICY "Users can delete their own expense splits"
          ON expense_splits
          FOR DELETE
          USING (expense_id IN (SELECT id FROM expenses WHERE user_id = auth.uid()));
        
        -- Refresh the schema cache
        NOTIFY pgrst, 'reload schema';
      `
    });
    
    if (sqlError) {
      console.warn("Error executing direct SQL:", sqlError);
      // Continue anyway, we'll try the function approach
    } else {
      console.log("Direct SQL execution successful");
    }
    
    // Now call the refresh schema function
    console.log("Calling refresh_postgrest_schema function...");
    const { error } = await supabase.rpc('refresh_postgrest_schema');
    
    if (error) {
      console.error("Error refreshing schema:", error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
    
    console.log("Schema refresh completed successfully");
    
    // Wait a moment to let the schema cache refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return NextResponse.json({ 
      success: true, 
      message: "Schema refreshed successfully" 
    });
    
  } catch (error) {
    console.error("Unexpected error during schema refresh:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

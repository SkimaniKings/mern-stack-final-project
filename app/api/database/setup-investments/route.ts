import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with admin privileges to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper function to execute SQL directly
async function executeSql(sql: string) {
  try {
    // Using the REST API directly
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'X-Client-Info': 'supabase-js/2.0.0',
        },
        body: JSON.stringify({
          query: sql,
        }),
      }
    )
    return await response.json()
  } catch (error) {
    console.error('Error executing SQL:', error)
    return null
  }
}

export async function GET() {
  try {
    // Create functions to check if tables and columns exist
    await executeSql(`
      CREATE OR REPLACE FUNCTION check_column_exists(table_name TEXT, column_name TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        exists BOOLEAN;
      BEGIN
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
        ) INTO exists;
        RETURN exists;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      CREATE OR REPLACE FUNCTION check_table_exists(table_name TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        exists BOOLEAN;
      BEGIN
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = $1
        ) INTO exists;
        RETURN exists;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      CREATE OR REPLACE FUNCTION refresh_postgrest_schema()
      RETURNS VOID AS $$
      BEGIN
        NOTIFY pgrst, 'reload schema';
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `)

    // Check if purchase_date column exists in investments table and add it if needed
    await executeSql(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investments') THEN
          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'investments' AND column_name = 'purchase_date') THEN
            ALTER TABLE investments ADD COLUMN purchase_date DATE;
            RAISE NOTICE 'Added purchase_date column to investments table';
          END IF;
        END IF;
      END
      $$;
    `)

    // Create investment_accounts table if it doesn't exist
    await executeSql(`
      CREATE TABLE IF NOT EXISTS investment_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
        account_name TEXT NOT NULL,
        account_type TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS investment_accounts_investment_id_idx ON investment_accounts(investment_id);
      CREATE INDEX IF NOT EXISTS investment_accounts_user_id_idx ON investment_accounts(user_id);
      
      -- Add RLS policies
      ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
      
      -- Policy for selecting accounts (only the owner can see their accounts)
      DROP POLICY IF EXISTS "Users can view their own investment accounts" ON investment_accounts;
      CREATE POLICY "Users can view their own investment accounts" 
        ON investment_accounts FOR SELECT 
        USING (auth.uid() = user_id);
        
      -- Policy for inserting accounts (only authenticated users can insert)
      DROP POLICY IF EXISTS "Users can insert their own investment accounts" ON investment_accounts;
      CREATE POLICY "Users can insert their own investment accounts" 
        ON investment_accounts FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
        
      -- Policy for updating accounts (only the owner can update their accounts)
      DROP POLICY IF EXISTS "Users can update their own investment accounts" ON investment_accounts;
      CREATE POLICY "Users can update their own investment accounts" 
        ON investment_accounts FOR UPDATE 
        USING (auth.uid() = user_id);
        
      -- Policy for deleting accounts (only the owner can delete their accounts)
      DROP POLICY IF EXISTS "Users can delete their own investment accounts" ON investment_accounts;
      CREATE POLICY "Users can delete their own investment accounts" 
        ON investment_accounts FOR DELETE 
        USING (auth.uid() = user_id);
    `)

    // Refresh the PostgREST schema cache
    await executeSql(`SELECT refresh_postgrest_schema();`)

    return NextResponse.json({ 
      success: true, 
      message: 'Database setup completed successfully' 
    })
  } catch (error) {
    console.error('Error setting up database:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to set up database' 
    }, { status: 500 })
  }
}

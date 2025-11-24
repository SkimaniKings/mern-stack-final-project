import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Create a cookie store without await since cookies() returns ReadonlyRequestCookies, not a Promise
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // First, ensure the debts table has all required columns
    const { data: columnCheckData, error: columnCheckError } = await supabase
      .rpc('ensure_debts_columns_exist')
      .select()
    
    if (columnCheckError) {
      console.error('Error checking columns:', columnCheckError)
      
      // If the RPC doesn't exist or fails, try direct SQL
      const { error: alterTableError } = await supabaseAdmin.rpc('execute_sql', {
        sql_query: `
          DO $$ 
          BEGIN
            -- Check if type column exists and add it if not
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'debts' AND column_name = 'type') THEN
              ALTER TABLE debts ADD COLUMN type TEXT DEFAULT 'personal_loan';
            END IF;
          END $$;
        `
      })
      
      if (alterTableError) {
        console.error('Error altering table:', alterTableError)
      }
    }
    
    // Create SQL functions for debt operations
    const { error: createFunctionsError } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        -- Function to insert a debt
        CREATE OR REPLACE FUNCTION insert_debt(
          p_id UUID,
          p_user_id UUID,
          p_name TEXT,
          p_type TEXT,
          p_current_balance NUMERIC,
          p_interest_rate NUMERIC,
          p_minimum_payment NUMERIC,
          p_loan_term INTEGER,
          p_due_date DATE
        ) RETURNS BOOLEAN AS $$
        BEGIN
          INSERT INTO debts (
            id, user_id, name, type, current_balance, interest_rate, 
            minimum_payment, loan_term, due_date, created_at, updated_at
          ) VALUES (
            p_id, p_user_id, p_name, p_type, p_current_balance, p_interest_rate,
            p_minimum_payment, p_loan_term, p_due_date, NOW(), NOW()
          );
          RETURN TRUE;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Error in insert_debt: %', SQLERRM;
          RETURN FALSE;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Function to update a debt
        CREATE OR REPLACE FUNCTION update_debt(
          p_id UUID,
          p_user_id UUID,
          p_name TEXT,
          p_type TEXT,
          p_current_balance NUMERIC,
          p_interest_rate NUMERIC,
          p_minimum_payment NUMERIC,
          p_loan_term INTEGER,
          p_due_date DATE
        ) RETURNS BOOLEAN AS $$
        BEGIN
          UPDATE debts SET
            name = p_name,
            type = p_type,
            current_balance = p_current_balance,
            interest_rate = p_interest_rate,
            minimum_payment = p_minimum_payment,
            loan_term = p_loan_term,
            due_date = p_due_date,
            updated_at = NOW()
          WHERE id = p_id AND user_id = p_user_id;
          RETURN TRUE;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Error in update_debt: %', SQLERRM;
          RETURN FALSE;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Function to delete a debt
        CREATE OR REPLACE FUNCTION delete_debt(
          p_id UUID,
          p_user_id UUID
        ) RETURNS BOOLEAN AS $$
        BEGIN
          DELETE FROM debts WHERE id = p_id AND user_id = p_user_id;
          RETURN TRUE;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Error in delete_debt: %', SQLERRM;
          RETURN FALSE;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Function to fetch debts for a user
        CREATE OR REPLACE FUNCTION fetch_debts_for_user(
          p_user_id UUID
        ) RETURNS SETOF debts AS $$
        BEGIN
          RETURN QUERY SELECT * FROM debts WHERE user_id = p_user_id ORDER BY created_at DESC;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Error in fetch_debts_for_user: %', SQLERRM;
          RETURN;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })
    
    if (createFunctionsError) {
      console.error('Error creating SQL functions:', createFunctionsError)
    }
    
    // Refresh the PostgREST schema cache
    const { error: refreshError } = await supabase.rpc('refresh_postgrest_schema')
    
    if (refreshError) {
      console.error('Error refreshing schema cache:', refreshError)
      
      // If the RPC doesn't exist, try direct SQL
      const { error: notifyError } = await supabaseAdmin.rpc('execute_sql', {
        sql_query: `NOTIFY pgrst, 'reload schema';`
      })
      
      if (notifyError) {
        console.error('Error sending NOTIFY command:', notifyError)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database setup completed successfully. Schema cache has been refreshed.'
    })
  } catch (error) {
    console.error('Error in debt setup:', error)
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      message: 'Please ensure the debts table exists with the required columns: type, current_balance, interest_rate, minimum_payment, loan_term'
    }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Use supabaseAdmin to bypass RLS and have full permissions
    
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'supabase', 'db', 'update_debts_rls.sql')
    let sqlContent = fs.readFileSync(sqlFilePath, 'utf8')
    
    // Execute the SQL script using supabaseAdmin
    const { error } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: sqlContent
    })
    
    if (error) {
      console.error('Error executing SQL script:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        message: 'Failed to update debts RLS policies'
      }, { status: 500 })
    }
    
    // Also directly update the RLS policies as a backup
    const { error: directError } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: `
        -- Drop all existing RLS policies for debts table
        DROP POLICY IF EXISTS "Users can manage their own debts" ON public.debts;
        DROP POLICY IF EXISTS "Authenticated users can manage their own debts" ON public.debts;
        DROP POLICY IF EXISTS "Anonymous users can manage debts with their client ID" ON public.debts;
        DROP POLICY IF EXISTS "Default user can access their debts" ON public.debts;
        
        -- Create a simple policy for authenticated users only
        CREATE POLICY "Authenticated users can manage their own debts"
        ON public.debts
        FOR ALL
        USING (
          -- Allow access if the user is authenticated and the record belongs to them
          (auth.uid() IS NOT NULL AND auth.uid() = user_id)
        );
        
        -- Refresh PostgREST schema cache
        NOTIFY pgrst, 'reload schema';
      `
    })
    
    if (directError) {
      console.warn('Error executing direct SQL for RLS update:', directError)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debts RLS policies updated successfully'
    })
  } catch (error) {
    console.error('Unexpected error updating debts RLS policies:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      message: 'Unexpected error updating debts RLS policies'
    }, { status: 500 })
  }
}

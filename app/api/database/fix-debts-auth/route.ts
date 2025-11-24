import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    console.log('Fixing debt authentication issues...')
    
    // SQL to update RLS policies for debts table
    const sql = `
      -- Drop existing RLS policies if they exist
      DROP POLICY IF EXISTS "Users can manage their own debts" ON public.debts;
      DROP POLICY IF EXISTS "Authenticated users can manage their own debts" ON public.debts;
      DROP POLICY IF EXISTS "Anonymous users can manage debts with their client ID" ON public.debts;
      DROP POLICY IF EXISTS "Default user can access their debts" ON public.debts;
      
      -- Enable RLS on the debts table
      ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
      
      -- Create a policy for authenticated users only
      CREATE POLICY "Authenticated users can manage their own debts"
      ON public.debts
      FOR ALL
      USING (
        -- Allow access if the user is authenticated and the record belongs to them
        (auth.uid() IS NOT NULL AND auth.uid() = user_id)
      );
      
      -- Refresh PostgREST schema cache to ensure the new policies are applied
      NOTIFY pgrst, 'reload schema';
    `
    
    // Execute the SQL using supabaseAdmin to bypass RLS
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql })
    
    if (error) {
      console.error('Error executing SQL:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to update debts RLS policies',
        error: error.message
      }, { status: 500 })
    }
    
    console.log('Successfully updated debts RLS policies')
    
    return NextResponse.json({
      success: true,
      message: 'Debts RLS policies updated successfully'
    })
  } catch (error) {
    console.error('Unexpected error updating debts RLS policies:', error)
    return NextResponse.json({
      success: false,
      message: 'Unexpected error updating debts RLS policies',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

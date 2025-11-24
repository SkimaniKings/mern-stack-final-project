import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    // Read the SQL file content
    const sqlFilePath = path.join(process.cwd(), 'supabase', 'db', 'update_debts_rls.sql')
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8')
    
    console.log('Executing SQL to update debts RLS policies...')
    
    // Execute the SQL using supabaseAdmin to bypass RLS
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: sqlContent })
    
    if (error) {
      console.error('Error executing SQL:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to update debts RLS policies',
        error: error.message
      }, { status: 500 })
    }
    
    // Refresh the PostgREST schema cache
    const { error: refreshError } = await supabaseAdmin.rpc('refresh_postgrest_schema')
    
    if (refreshError) {
      console.error('Error refreshing schema:', refreshError)
      return NextResponse.json({
        success: false,
        message: 'Failed to refresh schema cache',
        error: refreshError.message
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

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

// GET endpoint to inspect the watchlist table schema
export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client
    const supabase = createSupabaseClient()
    
    // Try a direct SQL query to get column information
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'watchlist')
    
    if (columnsError) {
      console.error("Error getting table columns:", columnsError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to get table schema",
        details: columnsError
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Schema retrieved",
      columns
    })
  } catch (error) {
    console.error("Error in schema inspection:", error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}

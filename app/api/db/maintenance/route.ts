import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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

// POST endpoint to run database maintenance tasks
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    const { task } = body
    
    // Create a Supabase client
    const supabase = createSupabaseClient()
    
    // Handle different maintenance tasks
    if (task === 'fix_watchlist_columns') {
      // Read the SQL script
      const scriptPath = path.join(process.cwd(), 'supabase', 'db', 'fix_watchlist_column_names.sql')
      const sqlScript = fs.readFileSync(scriptPath, 'utf8')
      
      // Execute the SQL script
      const { error } = await supabase.rpc('execute_sql', {
        sql_query: sqlScript
      })
      
      if (error) {
        console.error("Error executing SQL script:", error)
        return NextResponse.json({ 
          success: false, 
          error: "Failed to execute SQL script: " + error.message 
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        message: "Watchlist columns fixed successfully" 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: "Unknown maintenance task" 
      }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in database maintenance:", error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}

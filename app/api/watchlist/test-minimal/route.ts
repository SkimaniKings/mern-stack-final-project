import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

// GET endpoint to test adding an item to the watchlist with minimal fields
export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client
    const supabase = createSupabaseClient()
    
    // Generate a test user ID
    const userId = 'test-user-' + crypto.randomUUID()
    
    // Create minimal test item data
    const minimalItem = {
      id: crypto.randomUUID(),
      user_id: userId,
      ticker: 'TSLA',
      name: 'Tesla Inc',
      price: 180.50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('Trying minimal insert...')
    const result = await supabase
      .from('watchlist')
      .insert(minimalItem)
      .select()
    
    if (result.error) {
      console.log('Minimal insert failed:', result.error.message)
      return NextResponse.json({ 
        success: false, 
        error: "Insert failed",
        details: result.error
      })
    } else {
      return NextResponse.json({ 
        success: true, 
        message: "Item added with minimal fields",
        item: result.data[0]
      })
    }
  } catch (error) {
    console.error("Error in test endpoint:", error)
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 })
  }
}

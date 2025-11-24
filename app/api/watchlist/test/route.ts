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

// GET endpoint to test adding an item to the watchlist
export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client
    const supabase = createSupabaseClient()
    
    // Generate a test user ID
    const userId = 'test-user-' + crypto.randomUUID()
    
    // Create test item data
    const testItem = {
      id: crypto.randomUUID(),
      user_id: userId,
      ticker: 'TSLA',
      name: 'Tesla Inc',
      price: 180.50,
      target_price: 200.00,
      notes: 'Test note',
      sector: 'Technology',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Try first with price_alert_enabled
    console.log('Trying insert with price_alert_enabled...')
    const itemWithPriceAlertEnabled = {
      ...testItem,
      price_alert_enabled: true,
      alert_threshold: 190.00
    }
    
    const result1 = await supabase
      .from('watchlist')
      .insert(itemWithPriceAlertEnabled)
      .select()
    
    if (result1.error) {
      console.log('First attempt failed:', result1.error.message)
      
      // Try with price_alerts
      console.log('Trying insert with price_alerts...')
      const itemWithPriceAlerts = {
        ...testItem,
        price_alerts: true,
        alert_threshold: 190.00
      }
      
      const result2 = await supabase
        .from('watchlist')
        .insert(itemWithPriceAlerts)
        .select()
      
      if (result2.error) {
        console.log('Second attempt failed:', result2.error.message)
        return NextResponse.json({ 
          success: false, 
          error: "Both insert attempts failed",
          errors: [result1.error, result2.error]
        })
      } else {
        return NextResponse.json({ 
          success: true, 
          message: "Item added with price_alerts field",
          item: result2.data[0]
        })
      }
    } else {
      return NextResponse.json({ 
        success: true, 
        message: "Item added with price_alert_enabled field",
        item: result1.data[0]
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

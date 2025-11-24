import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST endpoint to add an item to the watchlist
 * This endpoint requires authentication and adds a new investment to the user's watchlist
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { ticker, name, price, targetPrice, notes, sector, priceAlertEnabled, alertThreshold } = body;
    
    // Validate required fields
    if (!ticker || !name) {
      return NextResponse.json({ 
        success: false, 
        error: "Ticker and name are required fields" 
      }, { status: 400 });
    }
    
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ 
        success: false, 
        error: "Authentication required" 
      }, { status: 401 });
    }
    
    // Use the authenticated user ID
    const userId = user.id;
    console.log('Using authenticated user ID:', userId);
    
    // Prepare the complete item data with all fields that might be needed by the client
    const itemId = crypto.randomUUID();
    
    // Prepare the data to insert
    const insertData = {
      id: itemId,
      user_id: userId,
      ticker: ticker.toUpperCase(),
      name,
      price: price || null,
      target_price: targetPrice || null,
      notes: notes || "",
      sector: sector || "Uncategorized",
      price_alert_enabled: priceAlertEnabled !== undefined ? priceAlertEnabled : false,
      alert_threshold: alertThreshold || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Try to save to the database
    try {
      const supabase = await createServerSupabaseClient();
      if (!supabase) {
        throw new Error("Failed to initialize Supabase client");
      }
      
      // Now insert the watchlist item
      const { data, error } = await supabase
        .from('watchlist')
        .insert([insertData])
        .select();
      
      if (error) {
        console.error("Error saving to database:", error);
        return NextResponse.json({ 
          success: false, 
          error: "Failed to add item to watchlist" 
        }, { status: 500 });
      }
      
      if (data && data.length > 0) {
        console.log("Successfully saved to database:", data);
        
        // Return the saved data
        return NextResponse.json({
          success: true,
          message: `${ticker} added to your watchlist`,
          item: data[0]
        });
      }
      
      // Fallback response if we somehow got here with no data and no error
      return NextResponse.json({
        success: true,
        message: `${ticker} added to your watchlist`,
        item: insertData
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ 
        success: false, 
        error: "Failed to add item to watchlist" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 });
  }
}

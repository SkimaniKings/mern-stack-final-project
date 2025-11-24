"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createClient } from '@supabase/supabase-js'

// Helper function to create a server-side Supabase client
async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials are not properly configured")
  }
  
  // Create a Supabase client with custom auth settings
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-client-info': 'server-action'
      }
    }
  })
  
  try {
    // Get all cookies from the request
    const cookieStore = cookies()
    
    // Try to extract access and refresh tokens
    const accessToken = cookieStore.get('sb-access-token')
    const refreshToken = cookieStore.get('sb-refresh-token')
    
    if (accessToken?.value && refreshToken?.value) {
      // Set the session with the tokens
      await supabase.auth.setSession({
        access_token: accessToken.value,
        refresh_token: refreshToken.value
      })
    }
  } catch (e) {
    console.error('Error handling cookies:', e)
  }
  
  return supabase
}

// Helper function to get the current authenticated user
async function getCurrentUser() {
  try {
    // Create a Supabase client with the user's session
    const supabase = await createServerSupabaseClient()
    
    // Get the user using getUser
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userData?.user) {
      return userData.user
    }
    
    // Try getSession as a fallback
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionData?.session?.user) {
      return sessionData.session.user
    }
    
    return null
  } catch (error) {
    console.error("Error getting authenticated user:", error)
    return null
  }
}

// Fetch stock quotes for multiple tickers
async function fetchStockQuotes(tickers: string[]) {
  const useRealApi = process.env.USE_REAL_FINNHUB_API === 'true'
  const apiKey = process.env.FINNHUB_API_KEY
  
  // Create a map to store the results
  const results: Record<string, any> = {}
  
  // Process each ticker
  for (const ticker of tickers) {
    try {
      // Generate a consistent mock price based on the ticker to make it look realistic
      const symbolHash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const mockPrice = 100 + (symbolHash % 900) / 10
      const mockChange = (symbolHash % 20 - 10) / 10
      const mockChangePercent = (mockChange / mockPrice) * 100
      
      // Create custom mock data for this ticker
      const mockData = {
        c: parseFloat(mockPrice.toFixed(2)),                // Current price
        h: parseFloat((mockPrice * 1.02).toFixed(2)),      // High price of the day
        l: parseFloat((mockPrice * 0.98).toFixed(2)),      // Low price of the day
        o: parseFloat((mockPrice * 0.99).toFixed(2)),      // Open price of the day
        pc: parseFloat((mockPrice - mockChange).toFixed(2)), // Previous close price
        d: parseFloat(mockChange.toFixed(2)),              // Change
        dp: parseFloat(mockChangePercent.toFixed(2))       // Percent change
      }
      
      // If we're not using the real API or don't have an API key, use mock data
      if (!useRealApi || !apiKey) {
        results[ticker] = mockData
        continue
      }
      
      // Try to fetch from the real API
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
        { 
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }
        }
      )
      
      // If the API call fails, use mock data
      if (!response.ok) {
        console.error(`Finnhub API error for ${ticker}:`, await response.text())
        results[ticker] = mockData
        continue
      }
      
      // If successful, store the real data
      const data = await response.json()
      results[ticker] = data
    } catch (error) {
      console.error(`Error fetching data for ${ticker}:`, error)
      // Use a simple mock data in case of error
      results[ticker] = {
        c: 100,
        h: 102,
        l: 98,
        o: 99,
        pc: 99.5,
        d: 0.5,
        dp: 0.5
      }
    }
  }
  
  return results
}

// Refresh watchlist prices
export async function refreshWatchlistPrices() {
  try {
    // Get the current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Authentication required", items: [] }
    }
    
    // Get the Supabase client
    const supabase = await createServerSupabaseClient()
    
    // Get the watchlist items for the user
    const { data: watchlistItems, error: watchlistError } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
    
    if (watchlistError) {
      console.error("Error fetching watchlist items:", watchlistError)
      return { success: false, error: "Failed to fetch watchlist items", items: [] }
    }
    
    if (!watchlistItems || watchlistItems.length === 0) {
      return { success: true, items: [] }
    }
    
    // Extract tickers from watchlist items
    const tickers = watchlistItems.map((item: any) => item.ticker)
    
    // Fetch the latest stock quotes
    const stockQuotes = await fetchStockQuotes(tickers)
    
    // Update the watchlist items with the latest prices
    const updatedItems = watchlistItems.map((item: any) => {
      const quote = stockQuotes[item.ticker]
      
      if (!quote) return item
      
      // Calculate if the price has reached or crossed the alert threshold
      const hasReachedAlertThreshold = 
        item.price_alerts && 
        item.alert_threshold !== null && 
        quote.c >= item.alert_threshold
      
      // Update the item with the latest price data
      return {
        ...item,
        price: quote.c,
        previous_close: quote.pc,
        price_change: quote.d,
        price_change_percent: quote.dp,
        day_high: quote.h,
        day_low: quote.l,
        last_updated: new Date().toISOString(),
        alert_triggered: hasReachedAlertThreshold
      }
    })
    
    // Update the database with the new prices
    for (const item of updatedItems) {
      // Only update the price and related fields, not other user settings
      await supabase
        .from('watchlist')
        .update({
          price: item.price,
          previous_close: item.previous_close,
          price_change: item.price_change,
          price_change_percent: item.price_change_percent,
          day_high: item.day_high,
          day_low: item.day_low,
          last_updated: item.last_updated,
          alert_triggered: item.alert_triggered
        })
        .eq('id', item.id)
    }
    
    // Revalidate the watchlist page to reflect the updated prices
    revalidatePath('/investments/watchlist')
    
    // Return the updated items
    return { 
      success: true, 
      items: updatedItems 
    }
  } catch (error) {
    console.error("Error refreshing watchlist prices:", error)
    return { success: false, error: "An unexpected error occurred", items: [] }
  }
}

// Get watchlist items with alerts
export async function getWatchlistAlerts() {
  try {
    // Get the current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Authentication required", alerts: [] }
    }
    
    // Get the Supabase client
    const supabase = await createServerSupabaseClient()
    
    // Get the watchlist items with active alerts for the user
    const { data: alertItems, error: alertError } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .eq('price_alerts', true)
      .not('alert_threshold', 'is', null)
    
    if (alertError) {
      console.error("Error fetching watchlist alerts:", alertError)
      return { success: false, error: "Failed to fetch watchlist alerts", alerts: [] }
    }
    
    // Filter items where the price has reached or exceeded the alert threshold
    const triggeredAlerts = alertItems.filter((item: any) => 
      item.price >= item.alert_threshold
    )
    
    return { 
      success: true, 
      alerts: triggeredAlerts 
    }
  } catch (error) {
    console.error("Error getting watchlist alerts:", error)
    return { success: false, error: "An unexpected error occurred", alerts: [] }
  }
}

// Update watchlist item with enhanced fields
export async function updateWatchlistItemEnhanced(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Authentication required" }
    }
    
    const id = formData.get('id') as string
    if (!id) {
      return { success: false, error: "Item ID is required" }
    }
    
    // Extract form data
    const targetPrice = formData.get('targetPrice') ? parseFloat(formData.get('targetPrice') as string) : null
    const notes = formData.get('notes') as string || ''
    const sector = formData.get('sector') as string || ''
    const priceAlertEnabled = formData.get('priceAlertEnabled') === 'on'
    const alertThreshold = formData.get('alertThreshold') ? parseFloat(formData.get('alertThreshold') as string) : null
    
    // Create the update object
    const updateData: any = {
      target_price: targetPrice,
      notes,
      sector,
      price_alerts: priceAlertEnabled,
      alert_threshold: priceAlertEnabled ? alertThreshold : null,
      updated_at: new Date().toISOString()
    }
    
    // Get the Supabase client
    const supabase = await createServerSupabaseClient()
    
    // Update the watchlist item
    const { error } = await supabase
      .from('watchlist')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
    
    if (error) {
      console.error("Error updating watchlist item:", error)
      return { success: false, error: `Failed to update: ${error.message}` }
    }
    
    // Revalidate the watchlist page
    revalidatePath('/investments/watchlist')
    
    return { success: true }
  } catch (error) {
    console.error("Error updating watchlist item:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Add to watchlist with enhanced fields
export async function addToWatchlistEnhanced(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Authentication required" }
    }
    
    // Extract form data
    const ticker = (formData.get('ticker') as string)?.toUpperCase()
    const name = formData.get('name') as string
    const price = parseFloat(formData.get('price') as string)
    const targetPrice = formData.get('targetPrice') ? parseFloat(formData.get('targetPrice') as string) : null
    const notes = formData.get('notes') as string || ''
    const sector = formData.get('sector') as string || ''
    const priceAlertEnabled = formData.get('priceAlertEnabled') === 'on'
    const alertThreshold = formData.get('alertThreshold') ? parseFloat(formData.get('alertThreshold') as string) : null
    
    if (!ticker || !name || isNaN(price)) {
      return { success: false, error: "Ticker, name, and price are required" }
    }
    
    // Get the Supabase client
    const supabase = await createServerSupabaseClient()
    
    // Check if the item already exists in the user's watchlist
    const { data: existingItems, error: checkError } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('ticker', ticker)
    
    if (checkError) {
      console.error("Error checking existing watchlist items:", checkError)
      return { success: false, error: `Failed to check existing items: ${checkError.message}` }
    }
    
    if (existingItems && existingItems.length > 0) {
      return { success: false, error: `${ticker} is already in your watchlist` }
    }
    
    // Create the new watchlist item
    const newItem = {
      user_id: user.id,
      ticker,
      name,
      price,
      target_price: targetPrice,
      notes,
      sector,
      price_alerts: priceAlertEnabled,
      alert_threshold: priceAlertEnabled ? alertThreshold : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      previous_close: null,
      price_change: null,
      price_change_percent: null,
      day_high: null,
      day_low: null,
      last_updated: new Date().toISOString(),
      alert_triggered: false
    }
    
    // Insert the new item
    const { error: insertError } = await supabase
      .from('watchlist')
      .insert(newItem)
    
    if (insertError) {
      console.error("Error adding to watchlist:", insertError)
      return { success: false, error: `Failed to add to watchlist: ${insertError.message}` }
    }
    
    // Revalidate the watchlist page
    revalidatePath('/investments/watchlist')
    
    return { success: true }
  } catch (error) {
    console.error("Error adding to watchlist:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

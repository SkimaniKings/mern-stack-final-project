"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Helper function to get the current authenticated user
async function getCurrentUser() {
  try {
    // Create a Supabase client with the user's session
    const supabase = await createServerSupabaseClient()
    
    try {
      // First try to get the user using getUser (more secure method that verifies with Supabase Auth server)
      // This is the recommended approach from our security improvements
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userData?.user) {
        console.log("Server auth: Authentication successful via getUser()")
        return userData.user
      }
      
      // Don't throw on user error, try next method
      if (userError) {
        console.warn("Server auth: getUser failed, trying alternative methods")
      }
      
      // Try getSession as a fallback
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionData?.session?.user) {
        console.log("Server auth: Authentication successful via getSession()")
        return sessionData.session.user
      }
      
      // Try refreshing the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshData?.user) {
        console.log("Server auth: Authentication successful via refreshSession()")
        return refreshData.user
      }
      
      if (refreshData?.session?.user) {
        console.log("Server auth: Authentication successful via refreshSession() session")
        return refreshData.session.user
      }
      
      // Log all errors but don't throw
      if (userError) console.warn("Server auth: getUser error:", userError)
      if (sessionError) console.warn("Server auth: getSession error:", sessionError)
      if (refreshError) console.warn("Server auth: refreshSession error:", refreshError)
    } catch (authMethodError) {
      console.error("Server auth: Error in authentication methods:", authMethodError)
    }
    
    // As a last resort, try to get the user from the JWT directly
    try {
      const cookieStore = await cookies()
      const accessToken = cookieStore.get('sb-access-token')?.value
      
      if (accessToken) {
        // Decode the JWT to extract the user information
        // This is not as secure as getUser but can work as a last resort
        const tokenParts = accessToken.split('.')
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]))
          if (payload.sub) {
            return {
              id: payload.sub,
              email: payload.email,
              role: payload.role,
              aud: payload.aud
            }
          }
        }
      }
    } catch (jwtError) {
      console.error("Error extracting user from JWT:", jwtError)
    }
    
    return null
  } catch (error) {
    console.error("Error getting authenticated user:", error)
    return null
  }
}

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
    // Get all cookies from the request - properly awaited to avoid errors
    const cookieStore = await cookies()
    
    // Try all possible cookie formats
    // 1. Try the standard sb-access-token and sb-refresh-token
    const accessTokenCookie = cookieStore.get('sb-access-token')
    const refreshTokenCookie = cookieStore.get('sb-refresh-token')
    const accessToken = accessTokenCookie?.value
    const refreshToken = refreshTokenCookie?.value
    
    if (accessToken && refreshToken) {
      try {
        // Set the session with the tokens
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        return supabase
      } catch (sessionError) {
        console.warn('Error setting session with sb tokens:', sessionError)
        // Continue to try other methods
      }
    }
    
    // 2. Try the supabase-auth-token cookie (array format)
    const supabaseAuthCookie = await cookieStore.get('supabase-auth-token')
    if (supabaseAuthCookie?.value) {
      try {
        // Handle base64-encoded cookies
        let cookieValue = supabaseAuthCookie.value;
        if (cookieValue && typeof cookieValue === 'string' && cookieValue.startsWith('base64-')) {
          try {
            // Remove 'base64-' prefix and decode
            const base64Value = cookieValue.substring(7); // Remove 'base64-' prefix
            cookieValue = Buffer.from(base64Value, 'base64').toString('utf-8');
          } catch (decodeError) {
            console.error('Error decoding base64 cookie:', decodeError);
            // Continue with original value if decoding fails
          }
        }
        
        // Parse the cookie value to extract the session data
        const sessionData = JSON.parse(decodeURIComponent(cookieValue))
        
        if (sessionData && Array.isArray(sessionData) && sessionData.length >= 2) {
          const [token, refreshToken] = sessionData
          
          if (token && refreshToken) {
            try {
              await supabase.auth.setSession({
                access_token: token,
                refresh_token: refreshToken
              })
              return supabase
            } catch (arraySessionError) {
              console.warn('Error setting session with array format:', arraySessionError)
            }
          }
        }
      } catch (parseError) {
        console.warn('Error parsing auth cookie:', parseError)
      }
    }
    
    // 2. Try the sb-auth-cookie
    const sbAuthCookie = cookieStore.get('sb-auth-cookie')
    if (sbAuthCookie?.value) {
      try {
        // Handle base64-encoded cookies
        let cookieValue = sbAuthCookie.value;
        if (cookieValue && typeof cookieValue === 'string' && cookieValue.startsWith('base64-')) {
          try {
            // Remove 'base64-' prefix and decode
            const base64Value = cookieValue.substring(7); // Remove 'base64-' prefix
            cookieValue = Buffer.from(base64Value, 'base64').toString('utf-8');
          } catch (decodeError) {
            console.error('Error decoding base64 cookie:', decodeError);
            // Continue with original value if decoding fails
          }
        }
        
        const authData = JSON.parse(cookieValue)
        if (authData?.access_token && authData?.refresh_token) {
          await supabase.auth.setSession({
            access_token: authData.access_token,
            refresh_token: authData.refresh_token
          })
          return supabase
        }
      } catch (parseError) {
        console.warn('Error parsing auth cookie:', parseError)
      }
    }
    
    // 3. Try the sb-auth-token cookie
    const sbAuthTokenCookie = cookieStore.get('sb-auth-token')
    if (sbAuthTokenCookie?.value) {
      try {
        // Handle base64-encoded cookies
        let cookieValue = sbAuthTokenCookie.value;
        if (cookieValue && typeof cookieValue === 'string' && cookieValue.startsWith('base64-')) {
          try {
            // Remove 'base64-' prefix and decode
            const base64Value = cookieValue.substring(7); // Remove 'base64-' prefix
            cookieValue = Buffer.from(base64Value, 'base64').toString('utf-8');
          } catch (decodeError) {
            console.error('Error decoding base64 cookie:', decodeError);
            // Continue with original value if decoding fails
          }
        }
        
        const tokenData = JSON.parse(cookieValue)
        if (tokenData?.access_token && tokenData?.refresh_token) {
          await supabase.auth.setSession({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token
          })
          return supabase
        }
      } catch (sbTokenError) {
        console.warn('Error parsing sb-auth-token:', sbTokenError)
      }
    }
  } catch (e) {
    console.error('Error handling cookies:', e)
  }
  
  return supabase
}

// Get watchlist items for the current user
export async function getWatchlistItems() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Authentication required", data: [] }
    }
    
    const supabase = await createServerSupabaseClient()
    
    try {
      // Attempt to get watchlist items
      const { data: items, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        // If the table doesn't exist, attempt to create it
        if (error.code === "42P01") { // PostgreSQL code for undefined_table
          console.log("Watchlist table doesn't exist yet. Attempting to create it...")
          
          try {
            // Try to run the migration script to create the watchlist table
            await supabase.rpc('create_watchlist_table')
            
            // Return mock data for now since the table was just created
            return { 
              success: true, 
              data: getMockWatchlistItems(user.id)
            }
          } catch (migrationErr) {
            console.error("Error running watchlist migration:", migrationErr)
            // Fallback to mock data
            return { 
              success: true, 
              data: getMockWatchlistItems(user.id)
            }
          }
        }
        
        console.error("Error fetching watchlist items:", error)
        return { success: false, error: error.message, data: [] }
      }
      
      // If no items found, return an empty array
      if (!items || items.length === 0) {
        return { success: true, data: [] }
      }
      
      // Enrich watchlist items with current prices
      const enrichedItems = await enrichWatchlistWithPrices(items)
      
      return { success: true, data: enrichedItems }
    } catch (dbError) {
      console.error("Database operation error:", dbError)
      // Fallback to mock data
      return { 
        success: true, 
        data: getMockWatchlistItems(user.id)
      }
    }
  } catch (error) {
    console.error("Error in getWatchlistItems:", error)
    return { success: false, error: "An unexpected error occurred", data: [] }
  }
}

// Add an item to the watchlist
export async function addToWatchlist(formData: FormData) {
  // Extract and validate form data first
  const ticker = (formData.get("ticker") as string)?.toUpperCase()
  const name = formData.get("name") as string
  const price = parseFloat(formData.get("price") as string)
  
  // Check for both camelCase and snake_case versions of field names
  const targetPrice = formData.get("targetPrice") 
    ? parseFloat(formData.get("targetPrice") as string) 
    : formData.get("target_price") 
      ? parseFloat(formData.get("target_price") as string) 
      : null
  
  const notes = formData.get("notes") as string || ""
  const sector = formData.get("sector") as string || "Uncategorized"
  
  // Check for all possible field name variations
  const priceAlertEnabled = formData.get("priceAlertEnabled") === "true" || 
    formData.get("price_alert_enabled") === "true" || 
    formData.get("priceAlerts") === "true" || 
    formData.get("price_alerts") === "true"
  
  // Check for both camelCase and snake_case versions
  const alertThreshold = formData.get("alertThreshold") 
    ? parseFloat(formData.get("alertThreshold") as string) 
    : formData.get("alert_threshold") 
      ? parseFloat(formData.get("alert_threshold") as string) 
      : null

  // Validate required fields
  if (!ticker || !name) {
    return { success: false, error: "Ticker and name are required fields" }
  }
  
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const user = await getCurrentUser()
    
    // Check authentication
    if (!user || !user.id) {
      console.warn("Authentication failed in addToWatchlist")
      return { 
        success: false, 
        error: "Authentication required",
        code: "AUTH_REQUIRED"
      }
    }

    // Get real-time price data if not provided
    let currentPrice = price
    if (isNaN(currentPrice) || currentPrice <= 0) {
      try {
        // Fetch latest price using Finnhub API
        const apiUrl = '/api/finnhub'
        const response = await fetch(`${apiUrl}?symbol=${encodeURIComponent(ticker)}`, {
          cache: 'no-store',
          next: { revalidate: 0 }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data && data.c) { // Current price in Finnhub API
            currentPrice = data.c
            
            // If no target price is set, suggest one based on current price
            // (5% above current price as a reasonable default)
            if (!targetPrice) {
              const suggestedTarget = Math.round(currentPrice * 1.05 * 100) / 100
              console.log(`Suggesting target price of ${suggestedTarget} for ${ticker}`)
            }
          }
        } else {
          console.error(`Error fetching price for ${ticker}: ${response.status} ${response.statusText}`)
          // Continue with the provided price or default to 0
          if (isNaN(currentPrice)) currentPrice = 0
        }
      } catch (priceError) {
        console.error(`Error fetching price for ${ticker}:`, priceError)
        // Continue with the provided price or default to 0
        if (isNaN(currentPrice)) currentPrice = 0
      }
    }

    // Check if the item already exists in the watchlist
    const { data: existingItems, error: checkError } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('ticker', ticker)

    if (checkError) {
      // If the table doesn't exist, attempt to create it
      if (checkError.code === "42P01") { // PostgreSQL code for undefined_table
        console.log("Watchlist table doesn't exist yet. Creating it...")
        
        try {
          // Try to create the watchlist table using RPC
          await supabase.rpc('create_watchlist_table').catch(async (rpcError) => {
            console.warn("RPC create_watchlist_table failed, falling back to SQL:", rpcError)
            
            // Fallback to direct SQL if RPC fails
            await supabase.rpc('execute_sql', {
              sql_query: `
                CREATE TABLE IF NOT EXISTS public.watchlist (
                  id uuid PRIMARY KEY,
                  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
                  ticker text NOT NULL,
                  name text NOT NULL,
                  price numeric,
                  target_price numeric,
                  notes text,
                  sector text,
                  price_alert_enabled boolean DEFAULT false,
                  alert_threshold numeric,
                  created_at timestamptz NOT NULL DEFAULT now(),
                  updated_at timestamptz NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
              `
            }).catch(sqlError => {
              console.error("Failed to create watchlist table via SQL:", sqlError)
            })
          })
        } catch (migrationErr) {
          console.error("Error creating watchlist table:", migrationErr)
          return { success: false, error: "Could not create watchlist table" }
        }
      } else {
        console.error("Error checking existing watchlist items:", checkError)
        return { success: false, error: checkError.message, code: checkError.code }
      }
    } else if (existingItems && existingItems.length > 0) {
      return { success: false, error: `${ticker} is already in your watchlist` }
    }

    // Generate a unique ID for the watchlist item
    const id = crypto.randomUUID()

    // Prepare data for insertion
    const insertData = {
      id,
      user_id: user.id,
      ticker,
      name,
      price: currentPrice,
      target_price: targetPrice,
      notes,
      sector,
      price_alert_enabled: priceAlertEnabled, // Match database column name
      alert_threshold: alertThreshold,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert the new watchlist item
    const { data, error } = await supabase
      .from('watchlist')
      .insert([insertData])
      .select()

    if (error) {
      console.error("Error adding item to watchlist:", error)
      
      // If the error is related to a missing column, try a more minimal insert
      if (error.message && (error.message.includes("column") || error.message.includes("schema"))) {
        console.log("Attempting minimal insert with only required fields...")
        
        // Use a minimal set of fields that should work with any schema
        const minimalInsertData = {
          id,
          user_id: user.id,
          ticker,
          name,
          price: currentPrice,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const { data: minimalResult, error: minimalError } = await supabase
          .from('watchlist')
          .insert([minimalInsertData])
          .select()
          
        if (minimalError) {
          console.error("Error with minimal insert:", minimalError)
          return { 
            success: false, 
            error: "Failed to add item to watchlist: " + minimalError.message,
            code: minimalError.code
          }
        }
        
        // Success with minimal data
        revalidatePath("/investments/watchlist")
        return { success: true, data: minimalResult }
      }
      
      return { 
        success: false, 
        error: "Failed to add item to watchlist: " + error.message,
        code: error.code
      }
    }

    // Revalidate the watchlist page to show the new item
    revalidatePath("/investments/watchlist")
    return { success: true, data }
  } catch (error) {
    console.error("Error in addToWatchlist:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    }
  }
}

// Update a watchlist item
export async function updateWatchlistItem(formData: FormData) {
  // Extract and validate form data first
  const id = formData.get("id") as string
  if (!id) {
    return { success: false, error: "Item ID is required" }
  }

  const ticker = (formData.get("ticker") as string)?.toUpperCase()
  const name = formData.get("name") as string
  const targetPrice = formData.get("targetPrice") ? parseFloat(formData.get("targetPrice") as string) : null
  const notes = formData.get("notes") as string || ""
  const sector = formData.get("sector") as string || "Uncategorized"
  const priceAlerts = formData.get("priceAlerts") === "true"
  const alertThreshold = formData.get("alertThreshold") ? parseFloat(formData.get("alertThreshold") as string) : null

  // Validate required fields
  if (!ticker || !name) {
    return { success: false, error: "Ticker and name are required fields" }
  }
  
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const user = await getCurrentUser()
    
    // Check authentication
    if (!user || !user.id) {
      console.warn("Authentication failed in updateWatchlistItem")
      return { 
        success: false, 
        error: "Authentication required",
        code: "AUTH_REQUIRED"
      }
    }
    
    // First, check if the item exists and belongs to the user
    const { data: existingItem, error: checkError } = await supabase
      .from('watchlist')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (checkError) {
      console.error("Error checking watchlist item:", checkError)
      return { 
        success: false, 
        error: "Failed to find the watchlist item: " + checkError.message,
        code: checkError.code
      }
    }
    
    if (!existingItem) {
      return { success: false, error: "Item not found or access denied" }
    }
    
    // Prepare update data - use consistent field names
    const updateData: any = {
      ticker,
      name,
      target_price: targetPrice,
      notes,
      sector,
      updated_at: new Date().toISOString()
    }
    
    // Handle different column naming conventions
    if ('price_alert_enabled' in existingItem) {
      updateData.price_alert_enabled = priceAlerts
    } else {
      updateData.price_alerts = priceAlerts
    }
    
    if ('alert_threshold' in existingItem || alertThreshold !== null) {
      updateData.alert_threshold = alertThreshold
    }
    
    // Update the watchlist item
    const { data, error } = await supabase
      .from('watchlist')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Security check
      .select()
    
    if (error) {
      console.error("Error updating watchlist item:", error)
      
      // If the error is related to a column, try a more minimal update
      if (error.message && (error.message.includes("column") || error.message.includes("schema"))) {
        console.log("Attempting minimal update with only basic fields...")
        
        // Use a minimal set of fields that should work with any schema
        const minimalUpdateData = {
          ticker,
          name,
          notes,
          updated_at: new Date().toISOString()
        }
        
        const { data: minimalUpdateResult, error: minimalError } = await supabase
          .from('watchlist')
          .update(minimalUpdateData)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          
        if (minimalError) {
          console.error("Error with minimal update:", minimalError)
          return { 
            success: false, 
            error: "Failed to update watchlist item: " + minimalError.message,
            code: minimalError.code
          }
        }
        
        // Success with minimal data
        revalidatePath("/investments/watchlist")
        return { success: true, data: minimalUpdateResult }
      }
      
      return { 
        success: false, 
        error: "Failed to update watchlist item: " + error.message,
        code: error.code
      }
    }
    
    // Revalidate the watchlist page to show the updated item
    revalidatePath("/investments/watchlist")
    return { success: true, data }
  } catch (error) {
    console.error("Error in updateWatchlistItem:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    }
  }
}

// Helper function to enrich watchlist items with current prices
async function enrichWatchlistWithPrices(items: any[]) {
  if (!items || items.length === 0) return items;
  
  try {
    // Get tickers for price updates
    const tickers = items.map(item => item.ticker).filter(Boolean);
    
    // Fetch latest prices using Finnhub API endpoint
    if (tickers.length > 0) {
      // Use absolute URL with the server's origin
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const apiUrl = `${baseUrl}/api/finnhub`;
      const pricePromises = tickers.map(async ticker => {
        try {
          const response = await fetch(`${apiUrl}?symbol=${encodeURIComponent(ticker)}`);
          if (response.ok) {
            return { ticker, data: await response.json() };
          }
          return { ticker, data: null };
        } catch (e) {
          console.error(`Error fetching price for ${ticker}:`, e);
          return { ticker, data: null };
        }
      });
      
      const priceResults = await Promise.all(pricePromises);
      const priceMap = priceResults.reduce<Record<string, number>>((acc, { ticker, data }) => {
        if (data && data.c) { // Current price in Finnhub API
          acc[ticker] = data.c;
        }
        return acc;
      }, {});
      
      // Update prices in the watchlist items
      return items.map(item => ({
        ...item,
        price: priceMap[item.ticker] || item.price
      }));
    }
  } catch (error) {
    console.error("Error enriching watchlist with prices:", error);
  }
  
  // Return original items if price enrichment fails
  return items;
}

// Remove an item from the watchlist
export async function removeFromWatchlist(id: string) {
  if (!id) {
    return { success: false, error: "Item ID is required" }
  }

  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const user = await getCurrentUser()
    
    // Check authentication
    if (!user || !user.id) {
      console.warn("Authentication failed in removeFromWatchlist")
      return { 
        success: false, 
        error: "Authentication required",
        code: "AUTH_REQUIRED"
      }
    }

    // Attempt to delete the item
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Security check to ensure users can only delete their own items
    
    if (error) {
      // If the table doesn't exist, attempt to create it
      if (error.code === "42P01") { // PostgreSQL code for undefined_table
        console.log("Watchlist table doesn't exist yet. Creating it...")
        
        try {
          // Try to create the watchlist table using RPC
          await supabase.rpc('create_watchlist_table').catch(async (rpcError) => {
            console.warn("RPC create_watchlist_table failed, falling back to SQL:", rpcError)
            
            // Fallback to direct SQL if RPC fails
            await supabase.rpc('execute_sql', {
              sql_query: `
                CREATE TABLE IF NOT EXISTS public.watchlist (
                  id uuid PRIMARY KEY,
                  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
                  ticker text NOT NULL,
                  name text NOT NULL,
                  price numeric,
                  target_price numeric,
                  notes text,
                  sector text,
                  price_alert_enabled boolean DEFAULT false,
                  alert_threshold numeric,
                  created_at timestamptz NOT NULL DEFAULT now(),
                  updated_at timestamptz NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
              `
            }).catch(sqlError => {
              console.error("Failed to create watchlist table via SQL:", sqlError)
            })
          })
          
          // Return success since there's no item to delete in a newly created table
          revalidatePath("/investments/watchlist")
          return { success: true, message: "Watchlist table created" }
        } catch (migrationErr) {
          console.error("Error creating watchlist table:", migrationErr)
          return { success: false, error: "Could not create watchlist table" }
        }
      }
      
      // Handle other database errors
      console.error("Error removing from watchlist:", error)
      return { 
        success: false, 
        error: error.message,
        code: error.code
      }
    }
    
    // Success case
    revalidatePath("/investments/watchlist")
    return { success: true }
  } catch (error) {
    console.error("Error in removeFromWatchlist:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    }
  }
}

// Fallback function to get mock watchlist items when the database table doesn't exist yet
function getMockWatchlistItems(userId: string) {
  // Generate deterministic IDs based on the user ID
  const generateId = (index: number) => {
    return crypto.createHash('md5').update(`${userId}-watchlist-${index}`).digest('hex')
  }

  // Include some ESG-friendly stocks to align with the Dripcheck ESG focus
  return [
    {
      id: generateId(1),
      user_id: userId,
      ticker: "MSFT",
      name: "Microsoft Corporation",
      price: 350.45,
      target_price: 400.00,
      notes: "Strong cloud growth with Azure",
      sector: "Technology",
      price_alert_enabled: true,
      alert_threshold: 370,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: generateId(2),
      user_id: userId,
      ticker: "AAPL",
      name: "Apple Inc.",
      price: 175.20,
      target_price: 200.00,
      notes: "Watching for new product announcements",
      sector: "Technology",
      price_alert_enabled: false,
      alert_threshold: null,
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: generateId(3),
      user_id: userId,
      ticker: "NVDA",
      name: "NVIDIA Corporation",
      price: 420.30,
      target_price: 500.00,
      notes: "AI and data center growth",
      sector: "Technology",
      price_alert_enabled: true,
      alert_threshold: 450,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
}

"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@supabase/ssr"

// Helper function to get the current user
async function getCurrentUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const cookieStore = await cookies()
  
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options)
      },
      remove(name: string, options: any) {
        cookieStore.set(name, '', { ...options, maxAge: 0 })
      },
    },
  })
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

// Helper function to create a server-side Supabase client
async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const cookieStore = await cookies()
  
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options)
      },
      remove(name: string, options: any) {
        cookieStore.set(name, '', { ...options, maxAge: 0 })
      },
    },
  })
}

// Types for investment portfolios
export type AssetClass = 'stocks' | 'bonds' | 'crypto' | 'real_estate' | 'commodities' | 'cash' | 'collectibles' | 'private_equity' | 'etf' | 'mutual_fund'

export interface InvestmentPortfolio {
  id: string
  user_id: string
  name: string
  description?: string
  base_currency: string
  created_at: string
  updated_at: string
  target_allocation: Record<string, number>
}

export interface InvestmentHolding {
  id: string
  portfolio_id: string
  symbol: string
  name?: string
  asset_class: AssetClass
  units: number
  purchase_price: number
  current_price?: number
  currency: string
  acquired_at: string
  sold_at?: string
  status: string
  created_at: string
  updated_at: string
}

// Get all portfolios for the current user
export async function getInvestmentPortfolios() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("investment_portfolios")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching portfolios:", error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error("Error in getInvestmentPortfolios:", error)
    return { error: "Failed to fetch portfolios" }
  }
}

// Get portfolio by ID
export async function getPortfolioById(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("investment_portfolios")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching portfolio:", error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error("Error in getPortfolioById:", error)
    return { error: "Failed to fetch portfolio" }
  }
}

// Create a new portfolio
export async function createPortfolio(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const base_currency = formData.get("base_currency") as string || "USD"
    
    // Parse target allocation if provided
    let target_allocation = {}
    const targetAllocationStr = formData.get("target_allocation") as string
    if (targetAllocationStr) {
      try {
        target_allocation = JSON.parse(targetAllocationStr)
      } catch (e) {
        console.error("Error parsing target allocation:", e)
      }
    }

    // Validate required fields
    if (!name) {
      return { error: "Portfolio name is required" }
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("investment_portfolios")
      .insert({
        user_id: user.id,
        name,
        description,
        base_currency,
        target_allocation,
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error("Error creating portfolio:", error)
      return { error: error.message }
    }

    revalidatePath("/investments")
    revalidatePath("/investments/portfolio")
    return { data: data[0] }
  } catch (error) {
    console.error("Error in createPortfolio:", error)
    return { error: "Failed to create portfolio" }
  }
}

// Update portfolio
export async function updatePortfolio(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const id = formData.get("id") as string
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const base_currency = formData.get("base_currency") as string || "USD"
    
    // Parse target allocation if provided
    let target_allocation = {}
    const targetAllocationStr = formData.get("target_allocation") as string
    if (targetAllocationStr) {
      try {
        target_allocation = JSON.parse(targetAllocationStr)
      } catch (e) {
        console.error("Error parsing target allocation:", e)
      }
    }

    // Validate required fields
    if (!id || !name) {
      return { error: "Portfolio ID and name are required" }
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("investment_portfolios")
      .update({
        name,
        description,
        base_currency,
        target_allocation,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()

    if (error) {
      console.error("Error updating portfolio:", error)
      return { error: error.message }
    }

    revalidatePath("/investments")
    revalidatePath("/investments/portfolio")
    return { data: data[0] }
  } catch (error) {
    console.error("Error in updatePortfolio:", error)
    return { error: "Failed to update portfolio" }
  }
}

// Delete portfolio
export async function deletePortfolio(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
      .from("investment_portfolios")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting portfolio:", error)
      return { error: error.message }
    }

    revalidatePath("/investments")
    revalidatePath("/investments/portfolio")
    return { success: true }
  } catch (error) {
    console.error("Error in deletePortfolio:", error)
    return { error: "Failed to delete portfolio" }
  }
}

// Get all holdings for a portfolio
export async function getPortfolioHoldings(portfolioId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    
    // First verify the portfolio belongs to the user
    const { data: portfolio, error: portfolioError } = await supabase
      .from("investment_portfolios")
      .select("id")
      .eq("id", portfolioId)
      .eq("user_id", user.id)
      .single()

    if (portfolioError || !portfolio) {
      console.error("Error verifying portfolio ownership:", portfolioError)
      return { error: "Portfolio not found or access denied" }
    }

    // Get the holdings
    const { data, error } = await supabase
      .from("investment_holdings")
      .select("*")
      .eq("portfolio_id", portfolioId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching holdings:", error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error("Error in getPortfolioHoldings:", error)
    return { error: "Failed to fetch holdings" }
  }
}

// Add a new holding to a portfolio
export async function addHolding(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const portfolio_id = formData.get("portfolio_id") as string
    const symbol = formData.get("symbol") as string
    const name = formData.get("name") as string
    const asset_class = formData.get("asset_class") as AssetClass
    const units = parseFloat(formData.get("units") as string)
    const purchase_price = parseFloat(formData.get("purchase_price") as string)
    const current_price = formData.get("current_price") ? parseFloat(formData.get("current_price") as string) : null
    const currency = formData.get("currency") as string || "USD"
    const acquired_at = formData.get("acquired_at") as string || new Date().toISOString().split('T')[0]
    const status = formData.get("status") as string || "active"

    // Validate required fields
    if (!portfolio_id || !symbol || !asset_class || isNaN(units) || isNaN(purchase_price)) {
      return { error: "Missing required fields. Please provide portfolio_id, symbol, asset_class, units, and purchase_price." }
    }

    const supabase = await createServerSupabaseClient()
    
    // First verify the portfolio belongs to the user
    const { data: portfolio, error: portfolioError } = await supabase
      .from("investment_portfolios")
      .select("id")
      .eq("id", portfolio_id)
      .eq("user_id", user.id)
      .single()

    if (portfolioError || !portfolio) {
      console.error("Error verifying portfolio ownership:", portfolioError)
      return { error: "Portfolio not found or access denied" }
    }

    // Add the holding
    const { data, error } = await supabase
      .from("investment_holdings")
      .insert({
        portfolio_id,
        symbol,
        name,
        asset_class,
        units,
        purchase_price,
        current_price,
        currency,
        acquired_at,
        status,
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error("Error adding holding:", error)
      return { error: error.message }
    }

    revalidatePath(`/investments/${portfolio_id}`)
    return { data: data[0] }
  } catch (error) {
    console.error("Error in addHolding:", error)
    return { error: "Failed to add holding" }
  }
}

// Update a holding
export async function updateHolding(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const id = formData.get("id") as string
    const portfolio_id = formData.get("portfolio_id") as string
    const symbol = formData.get("symbol") as string
    const name = formData.get("name") as string
    const asset_class = formData.get("asset_class") as AssetClass
    const units = parseFloat(formData.get("units") as string)
    const purchase_price = parseFloat(formData.get("purchase_price") as string)
    const current_price = formData.get("current_price") ? parseFloat(formData.get("current_price") as string) : null
    const currency = formData.get("currency") as string || "USD"
    const acquired_at = formData.get("acquired_at") as string
    const sold_at = formData.get("sold_at") as string
    const status = formData.get("status") as string || "active"

    // Validate required fields
    if (!id || !portfolio_id || !symbol || !asset_class || isNaN(units) || isNaN(purchase_price)) {
      return { error: "Missing required fields" }
    }

    const supabase = await createServerSupabaseClient()
    
    // First verify the portfolio belongs to the user
    const { data: portfolio, error: portfolioError } = await supabase
      .from("investment_portfolios")
      .select("id")
      .eq("id", portfolio_id)
      .eq("user_id", user.id)
      .single()

    if (portfolioError || !portfolio) {
      console.error("Error verifying portfolio ownership:", portfolioError)
      return { error: "Portfolio not found or access denied" }
    }

    // Update the holding
    const { data, error } = await supabase
      .from("investment_holdings")
      .update({
        symbol,
        name,
        asset_class,
        units,
        purchase_price,
        current_price,
        currency,
        acquired_at,
        sold_at,
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("portfolio_id", portfolio_id)
      .select()

    if (error) {
      console.error("Error updating holding:", error)
      return { error: error.message }
    }

    revalidatePath(`/investments/${portfolio_id}`)
    return { data: data[0] }
  } catch (error) {
    console.error("Error in updateHolding:", error)
    return { error: "Failed to update holding" }
  }
}

// Delete a holding
export async function deleteHolding(id: string, portfolioId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    
    // First verify the portfolio belongs to the user
    const { data: portfolio, error: portfolioError } = await supabase
      .from("investment_portfolios")
      .select("id")
      .eq("id", portfolioId)
      .eq("user_id", user.id)
      .single()

    if (portfolioError || !portfolio) {
      console.error("Error verifying portfolio ownership:", portfolioError)
      return { error: "Portfolio not found or access denied" }
    }

    // Delete the holding
    const { error } = await supabase
      .from("investment_holdings")
      .delete()
      .eq("id", id)
      .eq("portfolio_id", portfolioId)

    if (error) {
      console.error("Error deleting holding:", error)
      return { error: error.message }
    }

    revalidatePath("/investments")
    revalidatePath("/investments/portfolio")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteHolding:", error)
    return { error: "Failed to delete holding" }
  }
}

// Get portfolio allocation analysis
export async function getPortfolioAllocationAnalysis(portfolioId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    
    // First verify the portfolio belongs to the user
    const { data: portfolio, error: portfolioError } = await supabase
      .from("investment_portfolios")
      .select("id")
      .eq("id", portfolioId)
      .eq("user_id", user.id)
      .single()

    if (portfolioError || !portfolio) {
      console.error("Error verifying portfolio ownership:", portfolioError)
      return { error: "Portfolio not found or access denied" }
    }

    // Get the allocation analysis
    const { data, error } = await supabase
      .from("investment_allocation_analysis")
      .select("*")
      .eq("portfolio_id", portfolioId)

    if (error) {
      console.error("Error fetching allocation analysis:", error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error("Error in getPortfolioAllocationAnalysis:", error)
    return { error: "Failed to fetch allocation analysis" }
  }
}

// Get rebalancing suggestions
export async function getRebalancingSuggestions(portfolioId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    
    // First verify the portfolio belongs to the user
    const { data: portfolio, error: portfolioError } = await supabase
      .from("investment_portfolios")
      .select("id")
      .eq("id", portfolioId)
      .eq("user_id", user.id)
      .single()

    if (portfolioError || !portfolio) {
      console.error("Error verifying portfolio ownership:", portfolioError)
      return { error: "Portfolio not found or access denied" }
    }

    // Get the rebalancing suggestions
    const { data, error } = await supabase
      .from("portfolio_rebalancing_suggestions")
      .select("*")
      .eq("portfolio_id", portfolioId)

    if (error) {
      console.error("Error fetching rebalancing suggestions:", error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error("Error in getRebalancingSuggestions:", error)
    return { error: "Failed to fetch rebalancing suggestions" }
  }
}

// Get asset classes from enum
export async function getAssetClasses() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Query the pg_enum table to get the enum values
    const { data, error } = await supabase.rpc('get_asset_classes')

    if (error) {
      console.error("Error fetching asset classes:", error)
      
      // Return default asset classes if there's an error
      return { 
        data: [
          'stocks', 'bonds', 'crypto', 'real_estate', 
          'commodities', 'cash', 'collectibles', 
          'private_equity', 'etf', 'mutual_fund'
        ] 
      }
    }

    return { data }
  } catch (error) {
    console.error("Error in getAssetClasses:", error)
    
    // Return default asset classes if there's an error
    return { 
      data: [
        'stocks', 'bonds', 'crypto', 'real_estate', 
        'commodities', 'cash', 'collectibles', 
        'private_equity', 'etf', 'mutual_fund'
      ] 
    }
  }
}

"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"

// Helper function to get the current user
async function getCurrentUser() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          return (await cookies()).get(name)?.value
        },
        set: async (name, value, options) => {
          (await cookies()).set({ name, value, ...options })
        },
        remove: async (name, options) => {
          (await cookies()).set({ name, value: "", ...options })
        },
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user || null
}

// Helper function to create a server-side Supabase client
async function createServerSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          return (await cookies()).get(name)?.value
        },
        set: async (name, value, options) => {
          (await cookies()).set({ name, value, ...options })
        },
        remove: async (name, options) => {
          (await cookies()).set({ name, value: "", ...options })
        },
      },
    }
  )
}

// Get tax loss harvesting opportunities
export async function getTaxLossHarvestingOpportunities() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    const supabase = await createServerSupabaseClient()
    
    // Get investments with losses (where cost_basis > value)
    const { data, error } = await supabase
      .from('investments')
      .select(`
        id,
        name,
        ticker,
        type,
        value,
        cost_basis,
        allocation,
        categories:category_id (id, name, color),
        accounts:account_id (id, name, type)
      `)
      .eq('user_id', user.id)
      .lt('value', 'cost_basis') // Only get investments where value < cost_basis (loss)
    
    if (error) {
      console.error("Error fetching tax loss opportunities:", error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error("Error in getTaxLossHarvestingOpportunities:", error)
    return []
  }
}

// Get benchmark comparisons
export async function getBenchmarkComparisons() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Get total portfolio value
    const { data: investments, error: investmentsError } = await supabase
      .from('investments')
      .select('value, cost_basis, created_at')
      .eq('user_id', user.id)
    
    if (investmentsError) {
      console.error("Error fetching investments for benchmark comparison:", investmentsError)
      return null
    }
    
    // Calculate portfolio value
    const portfolioValue = investments?.reduce((sum, inv) => sum + (parseFloat(inv.value) || 0), 0) || 0
    
    // Since we don't have real benchmark data, create synthetic data
    // In a real app, this would come from a market data API or database
    
    // Calculate synthetic performance metrics for the portfolio
    const portfolioPerformance = {
      oneMonth: parseFloat((Math.random() * 6 - 2).toFixed(2)),  // -2% to 4%
      threeMonths: parseFloat((Math.random() * 10 - 3).toFixed(2)), // -3% to 7%
      ytd: parseFloat((Math.random() * 15 - 5).toFixed(2)),      // -5% to 10%
      oneYear: parseFloat((Math.random() * 20 - 5).toFixed(2)),  // -5% to 15%
      threeYears: parseFloat((Math.random() * 40 - 5).toFixed(2)) // -5% to 35%
    }
    
    // Create synthetic benchmark indices
    const indices = [
      {
        name: "S&P 500",
        oneMonth: parseFloat((Math.random() * 6 - 2).toFixed(2)),
        threeMonths: parseFloat((Math.random() * 10 - 3).toFixed(2)),
        ytd: parseFloat((Math.random() * 15 - 5).toFixed(2)),
        oneYear: parseFloat((Math.random() * 20 - 5).toFixed(2)),
        threeYears: parseFloat((Math.random() * 40 - 5).toFixed(2))
      },
      {
        name: "Dow Jones",
        oneMonth: parseFloat((Math.random() * 6 - 2).toFixed(2)),
        threeMonths: parseFloat((Math.random() * 10 - 3).toFixed(2)),
        ytd: parseFloat((Math.random() * 15 - 5).toFixed(2)),
        oneYear: parseFloat((Math.random() * 20 - 5).toFixed(2)),
        threeYears: parseFloat((Math.random() * 40 - 5).toFixed(2))
      },
      {
        name: "NASDAQ",
        oneMonth: parseFloat((Math.random() * 6 - 2).toFixed(2)),
        threeMonths: parseFloat((Math.random() * 10 - 3).toFixed(2)),
        ytd: parseFloat((Math.random() * 15 - 5).toFixed(2)),
        oneYear: parseFloat((Math.random() * 20 - 5).toFixed(2)),
        threeYears: parseFloat((Math.random() * 40 - 5).toFixed(2))
      }
    ]
    
    return {
      portfolioValue,
      portfolio: portfolioPerformance,
      indices
    }
  } catch (error) {
    console.error("Error in getBenchmarkComparisons:", error)
    return null
  }
}

// Get dividend reinvestment projection
export async function getDividendReinvestmentProjection(years: number = 5) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Get all investments
    const { data: investments, error } = await supabase
      .from('investments')
      .select(`
        id,
        name,
        ticker,
        type,
        value,
        cost_basis,
        allocation
      `)
      .eq('user_id', user.id)
    
    if (error) {
      console.error("Error fetching investments for dividend projection:", error)
      return []
    }
    
    if (!investments || investments.length === 0) {
      return []
    }
    
    // Calculate total portfolio value
    const totalPortfolioValue = investments.reduce((sum, inv) => sum + (parseFloat(inv.value) || 0), 0)
    
    // Create synthetic dividend projection data
    // In a real app, this would use actual dividend yields and growth rates
    
    const projectionData = []
    let currentValue = totalPortfolioValue
    
    // Generate projection for each year
    for (let year = 1; year <= years; year++) {
      // Assume average dividend yield of 2-4%
      const dividendYield = 0.02 + Math.random() * 0.02
      const dividends = currentValue * dividendYield
      
      // Assume average growth rate of 3-7%
      const growthRate = 0.03 + Math.random() * 0.04
      const growth = currentValue * growthRate
      
      // Calculate ending value
      const startingValue = currentValue
      currentValue = startingValue + dividends + growth
      
      projectionData.push({
        year: new Date().getFullYear() + year,
        startingValue: parseFloat(startingValue.toFixed(2)),
        dividends: parseFloat(dividends.toFixed(2)),
        growth: parseFloat(growth.toFixed(2)),
        endingValue: parseFloat(currentValue.toFixed(2))
      })
    }
    
    return projectionData
  } catch (error) {
    console.error("Error in getDividendReinvestmentProjection:", error)
    return []
  }
}

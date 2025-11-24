"use server"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

// Helper function to get the current user
async function getCurrentUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    }
  )
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

// Sample investment data for seeding
const sampleInvestments = [
  {
    name: "Vanguard Total Stock Market ETF",
    ticker: "VTI",
    type: "etf",
    value: 25000,
    cost_basis: 22000,
    quantity: 100,
    purchase_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    account: "Retirement",
    risk: "medium",
  },
  {
    name: "Apple Inc.",
    ticker: "AAPL",
    type: "stock",
    value: 15000,
    cost_basis: 12000,
    quantity: 75,
    purchase_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    account: "Brokerage",
    risk: "medium",
  },
  {
    name: "Vanguard Total Bond Market ETF",
    ticker: "BND",
    type: "bond",
    value: 20000,
    cost_basis: 19500,
    quantity: 200,
    purchase_date: new Date(Date.now() - 270 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    account: "Retirement",
    risk: "low",
  },
  {
    name: "Microsoft Corporation",
    ticker: "MSFT",
    type: "stock",
    value: 12000,
    cost_basis: 9000,
    quantity: 40,
    purchase_date: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    account: "Brokerage",
    risk: "medium",
  },
  {
    name: "Vanguard Real Estate ETF",
    ticker: "VNQ",
    type: "real_estate",
    value: 10000,
    cost_basis: 9500,
    quantity: 120,
    purchase_date: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    account: "Retirement",
    risk: "medium",
  },
  {
    name: "iShares 7-10 Year Treasury Bond ETF",
    ticker: "IEF",
    type: "bond",
    value: 8000,
    cost_basis: 8200,
    quantity: 80,
    purchase_date: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    account: "Retirement",
    risk: "low",
  },
  {
    name: "Amazon.com Inc.",
    ticker: "AMZN",
    type: "stock",
    value: 9000,
    cost_basis: 7500,
    quantity: 60,
    purchase_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    account: "Brokerage",
    risk: "high",
  },
  {
    name: "Cash Reserves",
    ticker: null,
    type: "cash",
    value: 5000,
    cost_basis: 5000,
    quantity: 5000,
    purchase_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    account: "Savings",
    risk: "none",
  },
]

// Function to seed the database with sample investment data
export async function seedInvestmentData() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "Not authenticated" }
    }

    const supabase = createClientComponentClient()

    // Check if the investments table exists
    const { error: tableCheckError } = await supabase
      .from('investments')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    // If the table doesn't exist, create it
    if (tableCheckError) {
      // This is a server action, so we can't create tables directly
      // Instead, return an error message suggesting to run migrations
      return { 
        success: false, 
        message: "Investments table doesn't exist. Please run the database migrations first." 
      }
    }

    // Clear existing investments for this user
    await supabase
      .from('investments')
      .delete()
      .eq('user_id', user.id)

    // Insert sample investments
    const investmentsWithUserId = sampleInvestments.map(investment => ({
      ...investment,
      user_id: user.id
    }))

    const { error } = await supabase
      .from('investments')
      .insert(investmentsWithUserId)

    if (error) {
      console.error("Error seeding investment data:", error)
      return { success: false, message: error.message }
    }

    // Generate historical price data for performance charts
    await seedHistoricalPriceData(user.id, supabase)

    return { success: true, message: "Sample investment data has been added to your account" }
  } catch (error) {
    console.error("Error in seedInvestmentData:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

// Helper function to seed historical price data
async function seedHistoricalPriceData(userId: string, supabase: any) {
  try {
    // Check if the investment_history table exists
    const { error: tableCheckError } = await supabase
      .from('investment_history')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    // If the table doesn't exist, we'll skip this part
    if (tableCheckError) {
      console.log("Investment history table doesn't exist, skipping historical data seeding")
      return
    }

    // Clear existing history for this user
    await supabase
      .from('investment_history')
      .delete()
      .eq('user_id', userId)

    // Get the investments we just created
    const { data: investments } = await supabase
      .from('investments')
      .select('id, value, cost_basis, purchase_date')
      .eq('user_id', userId)

    if (!investments || investments.length === 0) return

    // Generate 12 months of historical data for each investment
    const historyRecords = []
    const today = new Date()

    for (const investment of investments) {
      const startValue = investment.cost_basis
      const endValue = investment.value
      const purchaseDate = new Date(investment.purchase_date)
      
      // Generate monthly data points from purchase date to now
      for (let i = 0; i <= 12; i++) {
        const recordDate = new Date(today.getFullYear(), today.getMonth() - i, 15)
        
        // Skip if record date is before purchase date
        if (recordDate < purchaseDate) continue
        
        // Calculate a value based on linear progression from cost basis to current value
        // with some random variation
        const monthsSincePurchase = (today.getTime() - purchaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
        const monthsFromPurchaseToNow = (today.getTime() - recordDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
        
        // Calculate progress as a percentage (0 to 1)
        const progress = monthsSincePurchase > 0 ? 
          (monthsSincePurchase - monthsFromPurchaseToNow) / monthsSincePurchase : 1
        
        // Add some random variation (±5%)
        const randomFactor = 0.95 + Math.random() * 0.1
        
        // Calculate the value for this point in time
        const pointValue = startValue + (endValue - startValue) * progress * randomFactor
        
        historyRecords.push({
          investment_id: investment.id,
          user_id: userId,
          date: recordDate.toISOString().split('T')[0],
          value: Math.round(pointValue * 100) / 100
        })
      }
    }

    // Insert historical records in batches to avoid hitting limits
    const batchSize = 100
    for (let i = 0; i < historyRecords.length; i += batchSize) {
      const batch = historyRecords.slice(i, i + batchSize)
      await supabase.from('investment_history').insert(batch)
    }

  } catch (error) {
    console.error("Error seeding historical price data:", error)
  }
}

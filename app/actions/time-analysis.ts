"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { revalidatePath } from "next/cache"

// Interface for time analysis data
export interface TimeAnalysis {
  id: string
  user_id: string
  transaction_id: string
  time_of_day: string
  day_of_week: string
  is_impulse: boolean
  created_at: string
}

// Get time-of-day spending analysis
export async function getTimeOfDayAnalysis() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Get all expenses with time_of_day
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("id, amount, time_of_day, spent_at")
      .eq("user_id", user.id)
      .order("spent_at", { ascending: false })

    if (expensesError) {
      console.error("Error fetching expenses:", expensesError)
      throw new Error("Failed to fetch expenses")
    }

    if (!expenses || expenses.length === 0) {
      return {
        timeOfDayBreakdown: [],
        dayOfWeekBreakdown: [],
        impulseSpending: { impulse: 0, planned: 0 }
      }
    }

    // Analyze time of day spending
    const timeOfDayMap = {
      "Morning": 0,
      "Afternoon": 0,
      "Evening": 0,
      "Late Night": 0
    }

    const dayOfWeekMap = {
      "Sunday": 0,
      "Monday": 0,
      "Tuesday": 0,
      "Wednesday": 0,
      "Thursday": 0,
      "Friday": 0,
      "Saturday": 0
    }

    let impulseSpending = 0
    let plannedSpending = 0

    expenses.forEach(expense => {
      const timeOfDay = expense.time_of_day
      timeOfDayMap[timeOfDay] = (timeOfDayMap[timeOfDay] || 0) + expense.amount

      const date = new Date(expense.spent_at)
      const dayOfWeek = getDayName(date.getDay())
      dayOfWeekMap[dayOfWeek] = (dayOfWeekMap[dayOfWeek] || 0) + expense.amount

      // Determine if this is likely an impulse purchase based on time of day and day of week
      // This is a simple heuristic - evening/night and weekend purchases are more likely to be impulse
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const isEveningOrNight = timeOfDay === "Evening" || timeOfDay === "Late Night"
      
      if (isWeekend && isEveningOrNight) {
        impulseSpending += expense.amount
      } else {
        plannedSpending += expense.amount
      }
    })

    // Format time of day breakdown for visualization
    const timeOfDayBreakdown = Object.entries(timeOfDayMap).map(([time, amount]) => ({
      time,
      amount
    }))

    // Format day of week breakdown for visualization
    const dayOfWeekBreakdown = Object.entries(dayOfWeekMap).map(([day, amount]) => ({
      day,
      amount
    }))

    return {
      timeOfDayBreakdown,
      dayOfWeekBreakdown,
      impulseSpending: {
        impulse: impulseSpending,
        planned: plannedSpending
      }
    }
  } catch (error) {
    console.error("Error in getTimeOfDayAnalysis:", error)
    throw error
  }
}

// Get spending heatmap data (by day of week and time of day)
export async function getSpendingHeatmapData() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Get all expenses
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("amount, time_of_day, spent_at")
      .eq("user_id", user.id)

    if (expensesError) {
      console.error("Error fetching expenses:", expensesError)
      throw new Error("Failed to fetch expenses")
    }

    if (!expenses || expenses.length === 0) {
      return []
    }

    // Initialize heatmap data structure
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const timesOfDay = ["Morning", "Afternoon", "Evening", "Late Night"]
    
    const heatmapData = []
    
    // Initialize cells with zero values
    for (let day = 0; day < daysOfWeek.length; day++) {
      for (let time = 0; time < timesOfDay.length; time++) {
        heatmapData.push({
          day: daysOfWeek[day],
          time: timesOfDay[time],
          value: 0,
          count: 0
        })
      }
    }
    
    // Populate heatmap data
    expenses.forEach(expense => {
      const date = new Date(expense.spent_at)
      const dayOfWeek = daysOfWeek[date.getDay()]
      const timeOfDay = expense.time_of_day
      
      // Find the corresponding cell
      const cell = heatmapData.find(cell => cell.day === dayOfWeek && cell.time === timeOfDay)
      
      if (cell) {
        cell.value += expense.amount
        cell.count += 1
      }
    })
    
    return heatmapData
  } catch (error) {
    console.error("Error in getSpendingHeatmapData:", error)
    throw error
  }
}

// Analyze impulse spending
export async function analyzeImpulseSpending() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Get all expenses
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("id, amount, merchant_name, category, time_of_day, spent_at")
      .eq("user_id", user.id)
      .order("spent_at", { ascending: false })

    if (expensesError) {
      console.error("Error fetching expenses:", expensesError)
      throw new Error("Failed to fetch expenses")
    }

    if (!expenses || expenses.length === 0) {
      return {
        totalImpulseAmount: 0,
        totalPlannedAmount: 0,
        impulsePercentage: 0,
        topImpulseCategories: [],
        topImpulseMerchants: [],
        impulseByTimeOfDay: [],
        impulseByDayOfWeek: []
      }
    }

    // Analyze each expense for impulse patterns
    const impulseExpenses = []
    const plannedExpenses = []
    
    expenses.forEach(expense => {
      const date = new Date(expense.spent_at)
      const dayOfWeek = date.getDay()
      const timeOfDay = expense.time_of_day
      
      // Determine if this is likely an impulse purchase based on time of day and day of week
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isEveningOrNight = timeOfDay === "Evening" || timeOfDay === "Late Night"
      
      if (isWeekend && isEveningOrNight) {
        impulseExpenses.push(expense)
      } else {
        plannedExpenses.push(expense)
      }
    })
    
    // Calculate totals
    const totalImpulseAmount = impulseExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const totalPlannedAmount = plannedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const totalAmount = totalImpulseAmount + totalPlannedAmount
    const impulsePercentage = totalAmount > 0 ? (totalImpulseAmount / totalAmount) * 100 : 0
    
    // Analyze impulse spending by category
    const categoryMap = {}
    impulseExpenses.forEach(expense => {
      const category = expense.category || "Uncategorized"
      if (!categoryMap[category]) {
        categoryMap[category] = 0
      }
      categoryMap[category] += expense.amount
    })
    
    const topImpulseCategories = Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
    
    // Analyze impulse spending by merchant
    const merchantMap = {}
    impulseExpenses.forEach(expense => {
      const merchant = expense.merchant_name || "Unknown"
      if (!merchantMap[merchant]) {
        merchantMap[merchant] = 0
      }
      merchantMap[merchant] += expense.amount
    })
    
    const topImpulseMerchants = Object.entries(merchantMap)
      .map(([merchant, amount]) => ({ merchant, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
    
    // Analyze impulse spending by time of day
    const timeOfDayMap = {
      "Morning": 0,
      "Afternoon": 0,
      "Evening": 0,
      "Late Night": 0
    }
    
    impulseExpenses.forEach(expense => {
      const timeOfDay = expense.time_of_day
      timeOfDayMap[timeOfDay] = (timeOfDayMap[timeOfDay] || 0) + expense.amount
    })
    
    const impulseByTimeOfDay = Object.entries(timeOfDayMap)
      .map(([time, amount]) => ({ time, amount }))
    
    // Analyze impulse spending by day of week
    const dayOfWeekMap = {
      "Sunday": 0,
      "Monday": 0,
      "Tuesday": 0,
      "Wednesday": 0,
      "Thursday": 0,
      "Friday": 0,
      "Saturday": 0
    }
    
    impulseExpenses.forEach(expense => {
      const date = new Date(expense.spent_at)
      const dayOfWeek = getDayName(date.getDay())
      dayOfWeekMap[dayOfWeek] = (dayOfWeekMap[dayOfWeek] || 0) + expense.amount
    })
    
    const impulseByDayOfWeek = Object.entries(dayOfWeekMap)
      .map(([day, amount]) => ({ day, amount }))
    
    return {
      totalImpulseAmount,
      totalPlannedAmount,
      impulsePercentage,
      topImpulseCategories,
      topImpulseMerchants,
      impulseByTimeOfDay,
      impulseByDayOfWeek
    }
  } catch (error) {
    console.error("Error in analyzeImpulseSpending:", error)
    throw error
  }
}

// Record user interaction with expense tracking
export async function recordExpenseInteraction(interactionType: 'tap-entry' | 'voice' | 'scan' | 'suggestion', context: any) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    const { data, error } = await supabase
      .from("expense_interactions")
      .insert({
        user_id: user.id,
        interaction_type: interactionType,
        context
      })
      .select()
      .single()

    if (error) {
      console.error("Error recording expense interaction:", error)
      throw new Error("Failed to record expense interaction")
    }

    return data
  } catch (error) {
    console.error("Error in recordExpenseInteraction:", error)
    throw error
  }
}

// Helper function to get day name
function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return days[day]
}

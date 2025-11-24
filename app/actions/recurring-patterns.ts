"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { revalidatePath } from "next/cache"

// Interface for recurring pattern data
export interface RecurringPattern {
  id: string
  user_id: string
  merchant_id?: string
  merchant_name: string
  category: string
  avg_amount: number
  frequency: string
  next_due: string
  is_subscription: boolean
  confidence: number
  created_at: string
}

// Get all recurring patterns
export async function getRecurringPatterns() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    const { data, error } = await supabase
      .from("recurring_patterns")
      .select("*")
      .eq("user_id", user.id)
      .order("next_due", { ascending: true })

    if (error) {
      console.error("Error fetching recurring patterns:", error)
      throw new Error("Failed to fetch recurring patterns")
    }

    return data || []
  } catch (error) {
    console.error("Error in getRecurringPatterns:", error)
    throw error
  }
}

// Get recurring pattern by ID
export async function getRecurringPatternById(patternId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    const { data, error } = await supabase
      .from("recurring_patterns")
      .select("*")
      .eq("id", patternId)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching recurring pattern:", error)
      throw new Error("Failed to fetch recurring pattern")
    }

    return data
  } catch (error) {
    console.error("Error in getRecurringPatternById:", error)
    throw error
  }
}

// Create or update recurring pattern
export async function saveRecurringPattern(patternData: Partial<RecurringPattern> & { id?: string }) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    let result

    if (patternData.id) {
      // First check if the pattern belongs to the user
      const { data: pattern, error: patternError } = await supabase
        .from("recurring_patterns")
        .select("id")
        .eq("id", patternData.id)
        .eq("user_id", user.id)
        .single()

      if (patternError || !pattern) {
        throw new Error("Pattern not found or access denied")
      }

      // Update existing pattern
      const { data, error } = await supabase
        .from("recurring_patterns")
        .update({
          merchant_id: patternData.merchant_id,
          merchant_name: patternData.merchant_name,
          category: patternData.category,
          avg_amount: patternData.avg_amount,
          frequency: patternData.frequency,
          next_due: patternData.next_due,
          is_subscription: patternData.is_subscription,
          confidence: patternData.confidence
        })
        .eq("id", patternData.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating recurring pattern:", error)
        throw new Error("Failed to update recurring pattern")
      }

      result = data
    } else {
      // Create new pattern
      const { data, error } = await supabase
        .from("recurring_patterns")
        .insert({
          user_id: user.id,
          merchant_id: patternData.merchant_id,
          merchant_name: patternData.merchant_name,
          category: patternData.category,
          avg_amount: patternData.avg_amount,
          frequency: patternData.frequency,
          next_due: patternData.next_due,
          is_subscription: patternData.is_subscription !== undefined ? patternData.is_subscription : true,
          confidence: patternData.confidence || 0.5
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating recurring pattern:", error)
        throw new Error("Failed to create recurring pattern")
      }

      result = data
    }

    // Revalidate the expenses path to update UI
    revalidatePath("/expenses")
    
    return result
  } catch (error) {
    console.error("Error in saveRecurringPattern:", error)
    throw error
  }
}

// Delete recurring pattern
export async function deleteRecurringPattern(patternId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // First check if the pattern belongs to the user
    const { data: pattern, error: patternError } = await supabase
      .from("recurring_patterns")
      .select("id")
      .eq("id", patternId)
      .eq("user_id", user.id)
      .single()

    if (patternError || !pattern) {
      throw new Error("Pattern not found or access denied")
    }

    // Delete pattern
    const { error } = await supabase
      .from("recurring_patterns")
      .delete()
      .eq("id", patternId)

    if (error) {
      console.error("Error deleting recurring pattern:", error)
      throw new Error("Failed to delete recurring pattern")
    }

    // Revalidate the expenses path to update UI
    revalidatePath("/expenses")
    
    return { success: true }
  } catch (error) {
    console.error("Error in deleteRecurringPattern:", error)
    throw error
  }
}

// Detect recurring patterns from expenses
export async function detectRecurringPatterns() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Get all expenses
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("spent_at", { ascending: true })

    if (expensesError) {
      console.error("Error fetching expenses:", expensesError)
      throw new Error("Failed to fetch expenses")
    }

    if (!expenses || expenses.length === 0) {
      return []
    }

    // Group expenses by merchant and similar amounts
    const merchantGroups = {}
    
    expenses.forEach(expense => {
      const key = `${expense.merchant_name || expense.description}`
      if (!merchantGroups[key]) {
        merchantGroups[key] = []
      }
      merchantGroups[key].push(expense)
    })

    const patterns = []

    // Analyze each merchant group for patterns
    for (const [merchantKey, merchantExpenses] of Object.entries(merchantGroups)) {
      // Only consider merchants with at least 2 transactions
      if (merchantExpenses.length < 2) {
        continue
      }

      // Group by similar amounts (within 10% of each other)
      const amountGroups = {}
      
      merchantExpenses.forEach(expense => {
        let foundGroup = false
        
        for (const amount in amountGroups) {
          const amountDiff = Math.abs(expense.amount - parseFloat(amount))
          const percentDiff = amountDiff / parseFloat(amount)
          
          if (percentDiff <= 0.1) { // Within 10%
            amountGroups[amount].push(expense)
            foundGroup = true
            break
          }
        }
        
        if (!foundGroup) {
          amountGroups[expense.amount] = [expense]
        }
      })

      // Analyze each amount group for time patterns
      for (const [amount, amountExpenses] of Object.entries(amountGroups)) {
        // Only consider amount groups with at least 2 transactions
        if (amountExpenses.length < 2) {
          continue
        }

        // Sort by date
        amountExpenses.sort((a, b) => new Date(a.spent_at).getTime() - new Date(b.spent_at).getTime())
        
        // Calculate days between transactions
        const daysBetween = []
        for (let i = 1; i < amountExpenses.length; i++) {
          const date1 = new Date(amountExpenses[i-1].spent_at)
          const date2 = new Date(amountExpenses[i].spent_at)
          const diffTime = Math.abs(date2.getTime() - date1.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          daysBetween.push(diffDays)
        }
        
        // Calculate average interval and standard deviation
        const avgInterval = daysBetween.reduce((sum, days) => sum + days, 0) / daysBetween.length
        
        // Calculate standard deviation
        const variance = daysBetween.reduce((sum, days) => sum + Math.pow(days - avgInterval, 2), 0) / daysBetween.length
        const stdDev = Math.sqrt(variance)
        
        // Only consider patterns with low standard deviation (consistent intervals)
        const consistencyThreshold = avgInterval * 0.25 // 25% of average interval
        
        if (stdDev <= consistencyThreshold && amountExpenses.length >= 2) {
          // Determine frequency description
          let frequency = "irregular"
          let confidence = 0.5
          
          if (avgInterval >= 25 && avgInterval <= 35) {
            frequency = "monthly"
            confidence = 0.8
          } else if (avgInterval >= 6 && avgInterval <= 8) {
            frequency = "weekly"
            confidence = 0.8
          } else if (avgInterval >= 13 && avgInterval <= 16) {
            frequency = "bi-weekly"
            confidence = 0.7
          } else if (avgInterval >= 85 && avgInterval <= 95) {
            frequency = "quarterly"
            confidence = 0.7
          } else if (avgInterval >= 355 && avgInterval <= 375) {
            frequency = "yearly"
            confidence = 0.7
          } else {
            frequency = `every ${Math.round(avgInterval)} days`
            confidence = 0.6
          }
          
          // Higher confidence for more data points
          if (amountExpenses.length >= 4) {
            confidence += 0.1
          }
          if (amountExpenses.length >= 6) {
            confidence += 0.1
          }
          
          // Calculate next due date
          const lastDate = new Date(amountExpenses[amountExpenses.length - 1].spent_at)
          const nextDate = new Date(lastDate)
          nextDate.setDate(lastDate.getDate() + Math.round(avgInterval))
          
          // Create pattern
          const pattern = {
            merchant_name: merchantKey,
            category: amountExpenses[0].category,
            avg_amount: parseFloat(amount),
            frequency,
            next_due: nextDate.toISOString().split('T')[0],
            is_subscription: true,
            confidence,
            transactions: amountExpenses.length,
            avg_interval: avgInterval,
            std_dev: stdDev
          }
          
          patterns.push(pattern)
        }
      }
    }

    // Sort patterns by confidence
    patterns.sort((a, b) => b.confidence - a.confidence)
    
    return patterns
  } catch (error) {
    console.error("Error in detectRecurringPatterns:", error)
    throw error
  }
}

// Get upcoming recurring expenses
export async function getUpcomingRecurringExpenses(daysAhead: number = 30) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    const today = new Date()
    const futureDate = new Date(today)
    futureDate.setDate(today.getDate() + daysAhead)
    
    const todayStr = today.toISOString().split('T')[0]
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from("recurring_patterns")
      .select("*")
      .eq("user_id", user.id)
      .gte("next_due", todayStr)
      .lte("next_due", futureDateStr)
      .order("next_due", { ascending: true })

    if (error) {
      console.error("Error fetching upcoming recurring expenses:", error)
      throw new Error("Failed to fetch upcoming recurring expenses")
    }

    return data || []
  } catch (error) {
    console.error("Error in getUpcomingRecurringExpenses:", error)
    throw error
  }
}

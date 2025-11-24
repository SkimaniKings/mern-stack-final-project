"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth/server"

// Interface for recurring expense item
export interface RecurringExpense {
  id: string
  merchant: string
  amount: number
  recurrence: string
  monthlyEquivalent: number
  category_name?: string
  color?: string
}

// Get recurring expenses and calculate their monthly equivalents
export async function getRecurringExpensesMonthly(): Promise<RecurringExpense[]> {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return []
    }

    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }
    
    // Helper function to normalize an amount to its monthly equivalent
    function normalizeToMonthlyAmount(amount: number, frequency: string): number {
      switch (frequency) {
        case "annually":
          return amount / 12
        case "quarterly":
          return amount / 3
        case "bi-weekly":
          return amount * 2.17 // Average bi-weekly periods in a month
        case "weekly":
          return amount * 4.33 // Average weeks in a month
        case "daily":
          return amount * 30.42 // Average days in a month
        default:
          return amount // Monthly
      }
    }

    // Query recurring expenses
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        id,
        merchant,
        amount,
        recurrence,
        categories:expense_categories(id, name, color)
      `)
      .eq("user_id", user.id)
      .neq("recurrence", "none")
      .order("amount", { ascending: false })

    if (error) {
      console.error("Error fetching recurring expenses:", error)
      return []
    }

    // Transform and calculate monthly equivalents
    const recurringExpenses: RecurringExpense[] = (data || []).map(expense => {
      const monthlyEquivalent = normalizeToMonthlyAmount(expense.amount, expense.recurrence)
      const category = expense.categories ? expense.categories[0] : null
      
      return {
        id: expense.id,
        merchant: expense.merchant || "Unknown",
        amount: expense.amount,
        recurrence: expense.recurrence,
        monthlyEquivalent,
        category_name: category?.name || "Uncategorized",
        color: category?.color || "#888888"
      }
    })

    return recurringExpenses
  } catch (error) {
    console.error("Unexpected error in getRecurringExpensesMonthly:", error)
    return []
  }
}

"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { format } from "date-fns"

/**
 * Test function to fetch income data with the specific fields:
 * - name, frequency, amount, category, start date
 */
export async function testFetchIncomeData() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { error: "Failed to initialize Supabase client" }
  }
  
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { error: "Authentication required" }
    }
    
    console.log(`Fetching income data for user ${user.id}`)
    
    // Fetch income sources with the required fields
    const { data: incomeSources, error } = await supabase
      .from('income_sources')
      .select('id, name, type, amount, frequency, start_date')
      .eq('user_id', user.id)
    
    if (error) {
      console.error("Error fetching income sources:", error)
      return { error: error.message }
    }
    
    console.log(`Found ${incomeSources?.length || 0} income sources`)
    
    // Format the data for the report
    const formattedIncome = incomeSources?.map(income => {
      // Format date
      let formattedDate = ''
      try {
        if (income.start_date) {
          formattedDate = format(new Date(income.start_date), 'MMM dd, yyyy')
        }
      } catch (error) {
        console.error("Error formatting date:", error)
      }
      
      return {
        name: income.name || 'Unnamed Income',
        frequency: income.frequency || 'monthly',
        amount: income.amount || 0,
        formatted_amount: new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(income.amount || 0),
        category: income.type || 'other',
        start_date: income.start_date || '',
        formatted_start_date: formattedDate
      }
    }) || []
    
    return { 
      success: true, 
      data: formattedIncome,
      count: formattedIncome.length
    }
  } catch (error) {
    console.error("Error in testFetchIncomeData:", error)
    return { error: error.message || "Unknown error" }
  }
}

/**
 * Test function to fetch expense data with the specific fields:
 * - name, expense date, category, frequency, warranty expiry
 */
export async function testFetchExpenseData() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { error: "Failed to initialize Supabase client" }
  }
  
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { error: "Authentication required" }
    }
    
    console.log(`Fetching expense data for user ${user.id}`)
    
    // Fetch expenses with the required fields
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('id, merchant, expense_date, recurrence, warranty_expiration_date')
      .eq('user_id', user.id)
    
    if (error) {
      console.error("Error fetching expenses:", error)
      return { error: error.message }
    }
    
    console.log(`Found ${expenses?.length || 0} expenses`)
    
    // Format the data for the report
    const formattedExpenses = expenses?.map(expense => {
      // Format dates
      let formattedExpenseDate = ''
      let formattedWarrantyDate = ''
      
      try {
        if (expense.expense_date) {
          formattedExpenseDate = format(new Date(expense.expense_date), 'MMM dd, yyyy')
        }
        
        if (expense.warranty_expiration_date) {
          formattedWarrantyDate = format(new Date(expense.warranty_expiration_date), 'MMM dd, yyyy')
        }
      } catch (error) {
        console.error("Error formatting dates:", error)
      }
      
      return {
        name: expense.merchant || 'Unnamed Expense',
        expense_date: expense.expense_date || '',
        formatted_expense_date: formattedExpenseDate,
        category: 'General', // We'll need to fetch this separately
        frequency: expense.recurrence || 'none',
        warranty_expiry: expense.warranty_expiration_date || '',
        formatted_warranty_expiry: formattedWarrantyDate
      }
    }) || []
    
    return { 
      success: true, 
      data: formattedExpenses,
      count: formattedExpenses.length
    }
  } catch (error) {
    console.error("Error in testFetchExpenseData:", error)
    return { error: error.message || "Unknown error" }
  }
}

/**
 * Test function to fetch debt data with the specific fields:
 * - name, type/category, balance, interest rate, minimum payment
 */
export async function testFetchDebtData() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { error: "Failed to initialize Supabase client" }
  }
  
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { error: "Authentication required" }
    }
    
    console.log(`Fetching debt data for user ${user.id}`)
    
    // Fetch debts with the required fields
    const { data: debts, error } = await supabase
      .from('debts')
      .select('id, name, type, current_balance, interest_rate, minimum_payment')
      .eq('user_id', user.id)
    
    if (error) {
      console.error("Error fetching debts:", error)
      return { error: error.message }
    }
    
    console.log(`Found ${debts?.length || 0} debts`)
    
    // Format the data for the report
    const formattedDebts = debts?.map(debt => {
      return {
        name: debt.name || 'Unnamed Debt',
        type: debt.type || 'other',
        balance: debt.current_balance || 0,
        formatted_balance: new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(debt.current_balance || 0),
        interest_rate: debt.interest_rate || 0,
        formatted_interest_rate: `${(debt.interest_rate || 0).toFixed(2)}%`,
        minimum_payment: debt.minimum_payment || 0,
        formatted_minimum_payment: new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(debt.minimum_payment || 0)
      }
    }) || []
    
    return { 
      success: true, 
      data: formattedDebts,
      count: formattedDebts.length
    }
  } catch (error) {
    console.error("Error in testFetchDebtData:", error)
    return { error: error.message || "Unknown error" }
  }
}

/**
 * Test function to fetch subscription data with the specific fields:
 * - name, amount, category, frequency, auto renew, usage rating
 */
export async function testFetchSubscriptionData() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return { error: "Failed to initialize Supabase client" }
  }
  
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { error: "Authentication required" }
    }
    
    console.log(`Fetching subscription data for user ${user.id}`)
    
    // Fetch subscriptions with the required fields
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('id, name, amount, category, recurrence, auto_renew, usage_rating')
      .eq('user_id', user.id)
    
    if (error) {
      console.error("Error fetching subscriptions:", error)
      return { error: error.message }
    }
    
    console.log(`Found ${subscriptions?.length || 0} subscriptions`)
    
    // Format the data for the report
    const formattedSubscriptions = subscriptions?.map(subscription => {
      return {
        name: subscription.name || 'Unnamed Subscription',
        amount: subscription.amount || 0,
        formatted_amount: new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(subscription.amount || 0),
        category: subscription.category || 'other',
        frequency: subscription.recurrence || 'monthly',
        auto_renew: subscription.auto_renew === true ? 'Yes' : 'No',
        usage_rating: subscription.usage_rating !== null && subscription.usage_rating !== undefined 
          ? `${Math.round(subscription.usage_rating)}/10` 
          : 'Not rated'
      }
    }) || []
    
    return { 
      success: true, 
      data: formattedSubscriptions,
      count: formattedSubscriptions.length
    }
  } catch (error) {
    console.error("Error in testFetchSubscriptionData:", error)
    return { error: error.message || "Unknown error" }
  }
}

/**
 * Test function to fetch all report data
 */
export async function testFetchAllReportData() {
  try {
    // Fetch all data types in parallel
    const [incomeResult, expenseResult, debtResult, subscriptionResult] = await Promise.all([
      testFetchIncomeData(),
      testFetchExpenseData(),
      testFetchDebtData(),
      testFetchSubscriptionData()
    ])
    
    return {
      income: incomeResult.data || [],
      expenses: expenseResult.data || [],
      debts: debtResult.data || [],
      subscriptions: subscriptionResult.data || [],
      counts: {
        income: incomeResult.count || 0,
        expenses: expenseResult.count || 0,
        debts: debtResult.count || 0,
        subscriptions: subscriptionResult.count || 0
      }
    }
  } catch (error) {
    console.error("Error fetching all report data:", error)
    return { error: error.message || "Unknown error" }
  }
}

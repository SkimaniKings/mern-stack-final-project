"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser } from "@/lib/auth"
import { ReportType, TimeRange } from "./reports"
import { format } from "date-fns"
import { IncomeSource } from "@/types/income"
import { Expense } from "@/types/expense"
import { Debt } from "@/types/debt"
import { Subscription } from "@/types/subscription"

/**
 * Fetch income sources data
 */
export async function fetchIncomeSourcesData(supabase: any, userId: string, timeFilter: { start: Date, end: Date }) {
  try {
    console.log(`Fetching income sources data for user ${userId} from ${timeFilter.start.toISOString()} to ${timeFilter.end.toISOString()}`)
    
    // Fetch income sources with the required fields
    const { data: incomeSources, error: incomeError } = await supabase
      .from('income_sources')
      .select('id, name, type, amount, frequency, start_date')
      .eq('user_id', userId)
      .gte('start_date', timeFilter.start.toISOString())
      .lte('start_date', timeFilter.end.toISOString())
      .order('start_date', { ascending: false })
    
    if (incomeError) {
      console.error("Error fetching income sources:", incomeError)
      return []
    }
    
    // Fetch income categories for reference
    const { data: categories, error: categoriesError } = await supabase
      .from('income_categories')
      .select('id, name, color')
    
    if (categoriesError) {
      console.error("Error fetching income categories:", categoriesError)
    }
    
    const allCategories = categories || []
    console.log(`Income sources data fetched: ${incomeSources?.length || 0} income entries, ${allCategories.length} categories`)
    
    // Process the income sources data
    const processedIncomes = incomeSources?.map((income: any) => {
      // Format date
      let formattedDate = ''
      try {
        if (income.start_date) {
          formattedDate = format(new Date(income.start_date), 'MMM dd, yyyy')
        }
      } catch (error) {
        console.error("Error formatting date:", error)
      }
      
      // Format amount with currency
      const formattedAmount = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(income.amount || 0)
      
      return {
        id: income.id,
        name: income.name || 'Unnamed Income',
        frequency: income.frequency || 'monthly',
        amount: income.amount || 0,
        formatted_amount: formattedAmount,
        category: income.type || 'other',
        start_date: income.start_date || '',
        formatted_start_date: formattedDate
      }
    }) || []
    
    // Group incomes by source/type
    const sourceMap: Record<string, { source: string, amount: number, count: number, recurring_count: number }> = {}
    
    processedIncomes.forEach((income: any) => {
      const sourceKey = income.category
      const isRecurring = income.frequency !== 'one-time'
      
      if (!sourceMap[sourceKey]) {
        sourceMap[sourceKey] = {
          source: sourceKey,
          amount: 0,
          count: 0,
          recurring_count: 0
        }
      }
      
      sourceMap[sourceKey].amount += income.amount
      sourceMap[sourceKey].count += 1
      if (isRecurring) {
        sourceMap[sourceKey].recurring_count += 1
      }
    })
    
    // Calculate total income
    const totalIncome = processedIncomes.reduce((sum, income) => sum + (income.amount || 0), 0)
    
    // Format sources data
    const sources = Object.values(sourceMap).map(source => {
      const percent = totalIncome > 0 ? (source.amount / totalIncome * 100) : 0
      
      return {
        source: source.source,
        amount: source.amount,
        formatted_amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(source.amount),
        percent_of_total: percent,
        formatted_percent: `${percent.toFixed(1)}%`,
        count: source.count,
        recurring_count: source.recurring_count,
        recurring_percentage: source.count > 0 ? (source.recurring_count / source.count * 100) : 0
      }
    }).sort((a, b) => b.amount - a.amount)
    
    return {
      incomes: processedIncomes,
      sources,
      categories: allCategories || [],
      summary: {
        total_income: totalIncome,
        formatted_total: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalIncome),
        source_count: sources.length,
        transaction_count: processedIncomes.length,
        period: `${timeFilter.start.toLocaleDateString()} - ${timeFilter.end.toLocaleDateString()}`
      }
    }
  } catch (error) {
    console.error("Error in fetchIncomeSourcesData:", error)
    return []
  }
}

/**
 * Fetch expense data for reports with specific fields:
 * - name (merchant)
 * - expense date
 * - category
 * - frequency (recurrence)
 * - warranty expiry
 */
export async function fetchExpenseReportData(timeRange: { start: Date, end: Date }) {
  // Try to use admin client first to bypass RLS policies
  let supabase = await createAdminSupabaseClient()
  
  // Fall back to regular client if admin client fails
  if (!supabase) {
    supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }
  }
  
  // Get authenticated user
  const user = await getAuthenticatedUser()
  
  if (!user) {
    throw new Error("Authentication required")
  }
  
  try {
    // Fetch expenses with the required fields
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, merchant, amount, expense_date, recurrence, warranty_expiration_date, categories(name)')
      .eq('user_id', user.id)
      .gte('expense_date', timeRange.start.toISOString())
      .lte('expense_date', timeRange.end.toISOString())
      .order('expense_date', { ascending: false })
    
    if (expensesError) {
      console.error("Error fetching expenses:", expensesError)
      return []
    }
    
    // Format the data for the report
    const formattedExpenses = expenses.map((expense: Partial<Expense> & { categories?: any[] }) => {
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
      
      // Get category names from the joined categories
      const categoryNames = expense.categories && expense.categories.length > 0
        ? expense.categories.map(cat => cat.name).join(', ')
        : 'Uncategorized'
      
      // Format amount with currency
      const formattedAmount = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(expense.amount || 0)
      
      return {
        id: expense.id,
        name: expense.merchant || 'Unnamed Expense',
        expense_date: expense.expense_date || '',
        formatted_expense_date: formattedExpenseDate,
        category: categoryNames,
        frequency: expense.recurrence || 'none',
        warranty_expiry: expense.warranty_expiration_date || '',
        formatted_warranty_expiry: formattedWarrantyDate,
        amount: expense.amount || 0,
        formatted_amount: formattedAmount
      }
    })
    
    return formattedExpenses
  } catch (error) {
    console.error("Error in fetchExpenseReportData:", error)
    return []
  }
}

/**
 * Fetch debt data for reports with specific fields:
 * - name
 * - type or category
 * - balance
 * - interest rate
 * - minimum payment
 */
export async function fetchDebtReportData() {
  // Try to use admin client first to bypass RLS policies
  let supabase = await createAdminSupabaseClient()
  
  // Fall back to regular client if admin client fails
  if (!supabase) {
    supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }
  }
  
  // Get authenticated user
  const user = await getAuthenticatedUser()
  
  if (!user) {
    throw new Error("Authentication required")
  }
  
  try {
    // Fetch debts with the required fields
    const { data: debts, error: debtsError } = await supabase
      .from('debts')
      .select('id, name, type, current_balance, interest_rate, minimum_payment')
      .eq('user_id', user.id)
      .order('current_balance', { ascending: false })
    
    if (debtsError) {
      console.error("Error fetching debts:", debtsError)
      return []
    }
    
    // Format the data for the report
    const formattedDebts = debts.map((debt: Partial<Debt>) => {
      // Format monetary values with currency
      const formattedBalance = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(debt.current_balance || 0)
      
      const formattedMinPayment = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(debt.minimum_payment || 0)
      
      // Format interest rate with percentage
      const formattedInterestRate = `${(debt.interest_rate || 0).toFixed(2)}%`
      
      return {
        id: debt.id,
        name: debt.name || 'Unnamed Debt',
        type: debt.type || 'other',
        balance: debt.current_balance || 0,
        formatted_balance: formattedBalance,
        interest_rate: debt.interest_rate || 0,
        formatted_interest_rate: formattedInterestRate,
        minimum_payment: debt.minimum_payment || 0,
        formatted_minimum_payment: formattedMinPayment
      }
    })
    
    return formattedDebts
  } catch (error) {
    console.error("Error in fetchDebtReportData:", error)
    return []
  }
}

/**
 * Fetch subscription data for reports with specific fields:
 * - name
 * - amount
 * - category
 * - frequency (recurrence)
 * - auto renew
 * - usage rating
 */
export async function fetchSubscriptionReportData() {
  // Try to use admin client first to bypass RLS policies
  let supabase = await createAdminSupabaseClient()
  
  // Fall back to regular client if admin client fails
  if (!supabase) {
    supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }
  }
  
  // Get authenticated user
  const user = await getAuthenticatedUser()
  
  if (!user) {
    throw new Error("Authentication required")
  }
  
  try {
    // Fetch subscriptions with the required fields
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('id, name, amount, category, recurrence, auto_renew, usage_rating')
      .eq('user_id', user.id)
      .order('amount', { ascending: false })
    
    if (subscriptionsError) {
      console.error("Error fetching subscriptions:", subscriptionsError)
      return []
    }
    
    // Format the data for the report
    const formattedSubscriptions = subscriptions.map((subscription: Partial<Subscription>) => {
      // Format amount with currency
      const formattedAmount = new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(subscription.amount || 0)
      
      // Format usage rating as stars (if available)
      let usageRatingDisplay = 'Not rated'
      if (subscription.usage_rating !== null && subscription.usage_rating !== undefined) {
        const rating = Math.round(subscription.usage_rating)
        usageRatingDisplay = `${rating}/10`
      }
      
      return {
        id: subscription.id,
        name: subscription.name || 'Unnamed Subscription',
        amount: subscription.amount || 0,
        formatted_amount: formattedAmount,
        category: subscription.category || 'other',
        frequency: subscription.recurrence || 'monthly',
        auto_renew: subscription.auto_renew === true ? 'Yes' : 'No',
        usage_rating: subscription.usage_rating,
        usage_rating_display: usageRatingDisplay
      }
    })
    
    return formattedSubscriptions
  } catch (error) {
    console.error("Error in fetchSubscriptionReportData:", error)
    return []
  }
}

/**
 * Fetch income data for reports with specific fields:
 * - name
 * - frequency
 * - amount
 * - category (type)
 * - start date
 */
export async function fetchIncomeReportData(timeFilter: { start: Date, end: Date }) {
  // Try to use admin client first to bypass RLS policies
  let supabase = await createAdminSupabaseClient()
  
  // Fall back to regular client if admin client fails
  if (!supabase) {
    supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }
  }
  
  // Get authenticated user
  const user = await getAuthenticatedUser()
  
  if (!user) {
    throw new Error("Authentication required")
  }
  
  try {
    // Use the fetchIncomeSourcesData function to get income data
    const incomeData = await fetchIncomeSourcesData(supabase, user.id, timeFilter)
    return incomeData.incomes || []
  } catch (error) {
    console.error("Error in fetchIncomeReportData:", error)
    return []
  }
}

/**
 * Fetch all report data for the comprehensive report
 */
export async function fetchAllReportData(timeRange: TimeRange) {
  // Get time range filter
  const timeFilter = getTimeRangeFilter(timeRange)
  
  try {
    // Fetch all data types in parallel
    const [incomeData, expenseData, debtData, subscriptionData] = await Promise.all([
      fetchIncomeReportData(timeFilter),
      fetchExpenseReportData(timeFilter),
      fetchDebtReportData(),
      fetchSubscriptionReportData()
    ])
    
    return {
      income: incomeData,
      expenses: expenseData,
      debts: debtData,
      subscriptions: subscriptionData,
      timeRange: {
        start: timeFilter.start.toISOString(),
        end: timeFilter.end.toISOString(),
        formatted_start: format(timeFilter.start, 'MMM dd, yyyy'),
        formatted_end: format(timeFilter.end, 'MMM dd, yyyy')
      }
    }
  } catch (error) {
    console.error("Error fetching all report data:", error)
    return {
      income: [],
      expenses: [],
      debts: [],
      subscriptions: [],
      timeRange: {
        start: timeFilter.start.toISOString(),
        end: timeFilter.end.toISOString(),
        formatted_start: format(timeFilter.start, 'MMM dd, yyyy'),
        formatted_end: format(timeFilter.end, 'MMM dd, yyyy')
      }
    }
  }
}

/**
 * Helper function to get date range from time range
 */
function getTimeRangeFilter(timeRange: TimeRange): { start: Date, end: Date } {
  const end = new Date()
  let start = new Date()
  
  switch (timeRange) {
    case '7d':
      start.setDate(end.getDate() - 7)
      break
    case '30d':
      start.setDate(end.getDate() - 30)
      break
    case '90d':
      start.setDate(end.getDate() - 90)
      break
    case '1y':
      start.setFullYear(end.getFullYear() - 1)
      break
    case 'ytd':
      start = new Date(end.getFullYear(), 0, 1) // January 1st of current year
      break
    case 'all':
      start = new Date(2000, 0, 1) // Far in the past
      break
    default:
      start.setDate(end.getDate() - 30) // Default to 30 days
  }
  
  return { start, end }
}

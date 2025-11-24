"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { getAuthenticatedUser } from "@/lib/auth"
import { format } from "date-fns"
import { TimeRange } from "./reports"

/**
 * Fetches income data with the specific fields:
 * - name, frequency, amount, category, start date
 */
export async function fetchIncomeData(timeRange: { start: Date, end: Date }) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }
  
  const user = await getAuthenticatedUser()
  if (!user) {
    throw new Error("Authentication required")
  }
  
  console.log(`Fetching income data for time range: ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`)
  
  try {
    // Use the 'incomes' table with the correct column names based on the existing code
    const { data: incomeSources, error } = await supabase
      .from('incomes')
      .select('*, income_categories(*)')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })
      
    if (error) {
      console.error("Error fetching income sources:", error)
      return []
    }
    
    // Filter income sources based on their frequency and start/end dates
    const filteredIncome = incomeSources?.filter((income: any) => {
      if (!income.start_date) return false; // Exclude incomes with no start date
      
      const startDate = new Date(income.start_date);
      const endDate = income.end_date ? new Date(income.end_date) : null;
      
      // For one-time incomes, only include if the payment date is within the report period
      if (income.recurrence === 'none' || income.recurrence === 'one_time') {
        return startDate >= timeRange.start && startDate <= timeRange.end;
      }
      
      // For recurring incomes, check if any occurrence falls within the report period
      // First, check if the income is active during the report period at all
      const isActiveInPeriod = (!endDate || endDate >= timeRange.start) && 
                              startDate <= timeRange.end;
      
      if (!isActiveInPeriod) return false;
      
      // For active recurring incomes, include them if they have any occurrence in the report period
      // based on their frequency
      const reportStart = timeRange.start;
      const reportEnd = timeRange.end;
      
      // If no end date, include if start date is before or during report period
      if (!endDate) return startDate <= reportEnd;
      
      // For incomes with both start and end dates, check if any occurrence falls in the period
      const start = Math.max(startDate.getTime(), reportStart.getTime());
      const end = Math.min(endDate.getTime(), reportEnd.getTime());
      
      if (start > end) return false; // No overlap
      
      // For recurring incomes, we'll include them if they're active during the period
      // The exact occurrence calculation would be complex, so we'll be inclusive
      // and let the report viewer see all active recurring incomes
      return true;
    }) || [];
    
    console.log(`Found ${incomeSources?.length || 0} income sources, filtered to ${filteredIncome.length} within date range`)
    
    // Log a sample income entry to debug field names
    if (filteredIncome.length > 0) {
      console.log('Sample income entry structure:', JSON.stringify(filteredIncome[0], null, 2));
    }
    
    const formattedIncome = filteredIncome.map((income: any) => {
      // Get category name from the joined income_categories data
      const categoryName = income.income_categories?.name || 'Other';
      
      // Use the source_name field if available, fallback to title or description
      const incomeName = income.source_name || income.title || income.description || 'Unnamed Income';
      
      return {
        name: incomeName,
        frequency: income.recurrence || 'monthly', // Using recurrence instead of frequency
        amount: income.amount || 0,
        category: categoryName,
        start_date: income.start_date ? new Date(income.start_date).toISOString() : null,
        formatted_amount: new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(income.amount || 0),
        formatted_date: income.start_date ? format(new Date(income.start_date), 'MMM d, yyyy') : 'N/A'
      }
    }) || [];
    
    console.log(`Formatted ${formattedIncome.length} income entries with correct field mappings`)
    
    return formattedIncome
  } catch (error) {
    console.error("Error in fetchIncomeData:", error)
    return []
  }
}

/**
 * Fetches expense data with the specific fields:
 * - name, expense date, category, frequency, warranty expiry
 */
export async function fetchExpenseData(timeRange: { start: Date, end: Date }) {
  console.log(`fetchExpenseData: Received timeRange.start type: ${typeof timeRange.start}, value: ${timeRange.start?.toString()}`);
  console.log(`fetchExpenseData: Received timeRange.end type: ${typeof timeRange.end}, value: ${timeRange.end?.toString()}`);

  // Defensive check and potential conversion for timeRange properties
  let queryStartDate: Date = timeRange.start;
  let queryEndDate: Date = timeRange.end;

  if (typeof timeRange.start === 'string') {
    console.warn('fetchExpenseData: timeRange.start was a string, converting to Date.');
    queryStartDate = new Date(timeRange.start);
  }
  if (typeof timeRange.end === 'string') {
    console.warn('fetchExpenseData: timeRange.end was a string, converting to Date.');
    queryEndDate = new Date(timeRange.end);
  }

  if (!(queryStartDate instanceof Date) || !(queryEndDate instanceof Date) || isNaN(queryStartDate.getTime()) || isNaN(queryEndDate.getTime())) {
    console.error(`fetchExpenseData: Invalid Date objects after potential conversion. Start: ${queryStartDate}, End: ${queryEndDate}. Aborting fetch.`);
    return [];
  }
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }
  
  const user = await getAuthenticatedUser()
  if (!user) {
    console.error("fetchExpenseData: Authentication required, getAuthenticatedUser returned null.");
    throw new Error("Authentication required")
  }
  console.log(`fetchExpenseData: Using user ID: ${user.id}`);
  
  const startDateStr = queryStartDate.toISOString();
  const endDateStr = queryEndDate.toISOString();
  console.log(`fetchExpenseData: Querying with start_date >= ${startDateStr} and end_date <= ${endDateStr}`);
  console.log(`Fetching expense data for time range: ${startDateStr} to ${endDateStr}`);
  
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('id, merchant, amount, expense_date, recurrence, warranty_expiration_date')
      .eq('user_id', user.id)
      .gte('expense_date', startDateStr)
      .lte('expense_date', endDateStr)
      .order('expense_date', { ascending: false })
      
    if (error) {
      console.error("Error fetching expenses:", error)
      return []
    }
    
    console.log(`Filtered expenses by date range: ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}, found ${expenses?.length || 0} expenses`)
    
    // Fetch categories for each expense
    const { data: expenseCategories, error: categoryError } = await supabase
      .from('expense_categories')
      .select('id, name')
    
    if (categoryError) {
      console.error("Error fetching expense categories:", categoryError)
    }
    
    // Fetch expense-category links
    const { data: categoryLinks, error: linkError } = await supabase
      .from('expense_category_links')
      .select('expense_id, category_id')
    
    if (linkError) {
      console.error("Error fetching expense category links:", linkError)
    }
    
    console.log(`Found ${expenses?.length || 0} expenses`)
    
    const formattedExpenses = expenses?.map(expense => {
      // Find categories for this expense
      const expenseCategoryIds = categoryLinks?.filter(link => link.expense_id === expense.id)
        .map(link => link.category_id) || []
      
      const expenseCategoryNames = expenseCategoryIds.map(categoryId => {
        const category = expenseCategories?.find(cat => cat.id === categoryId)
        return category?.name || 'Uncategorized'
      }).join(', ') || 'Uncategorized'
      
      return {
        name: expense.merchant || 'Unnamed Expense',
        amount: expense.amount || 0,
        formatted_amount: new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(expense.amount || 0),
        expense_date: expense.expense_date || '',
        formatted_expense_date: expense.expense_date ? format(new Date(expense.expense_date), 'MMM dd, yyyy') : '',
        category: expenseCategoryNames,
        frequency: expense.recurrence || 'none',
        warranty_expiry: expense.warranty_expiration_date || '',
        formatted_warranty_expiry: expense.warranty_expiration_date ? format(new Date(expense.warranty_expiration_date), 'MMM dd, yyyy') : ''
      }
    }) || []
    
    return formattedExpenses
  } catch (error) {
    console.error("Error in fetchExpenseData:", error)
    return []
  }
}

/**
 * Fetches debt data with the specific fields:
 * - name, type/category, balance, interest rate, minimum payment
 */
export async function fetchDebtData() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }
  
  const user = await getAuthenticatedUser()
  if (!user) {
    throw new Error("Authentication required")
  }
  
  console.log(`Fetching debt data`)
  
  try {
    const { data: debts, error } = await supabase
      .from('debts')
      .select('id, name, type, current_balance, interest_rate, minimum_payment')
      .eq('user_id', user.id)
      
    if (error) {
      console.error("Error fetching debts:", error)
      return []
    }
    
    console.log(`Found ${debts?.length || 0} debts`)
    
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
    
    return formattedDebts
  } catch (error) {
    console.error("Error in fetchDebtData:", error)
    return []
  }
}

/**
 * Fetches subscription data with the specific fields:
 * - name, amount, category, frequency, auto renew, usage rating
 */
export async function fetchSubscriptionData() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }
  
  const user = await getAuthenticatedUser()
  if (!user) {
    throw new Error("Authentication required")
  }
  
  console.log(`Fetching subscription data`)
  
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('id, name, amount, category, recurrence, auto_renew, usage_rating')
      .eq('user_id', user.id)
      
    if (error) {
      console.error("Error fetching subscriptions:", error)
      return []
    }
    
    console.log(`Found ${subscriptions?.length || 0} subscriptions`)
    
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
    
    return formattedSubscriptions
  } catch (error) {
    console.error("Error in fetchSubscriptionData:", error)
    return []
  }
}

/**
 * Fetches all report data for the comprehensive report
 */
export async function fetchReportData(reportType: string, timeRange: TimeRange) {
  // Get time range filter
  const timeFilter = getTimeRangeFilter(timeRange)
  
  console.log(`Fetching ${reportType} report data for time range: ${timeRange}`)
  
  try {
    switch (reportType) {
      case 'income-sources':
        return await fetchIncomeData(timeFilter)
        
      case 'expense-trends':
        return await fetchExpenseData(timeFilter)
        
      case 'debt-analysis':
        return await fetchDebtData()
        
      case 'subscriptions':
        return await fetchSubscriptionData()
        
      case 'overview':
        // Fetch all data types in parallel
        const [incomeData, expenseData, debtData, subscriptionData] = await Promise.all([
          fetchIncomeData(timeFilter),
          fetchExpenseData(timeFilter),
          fetchDebtData(),
          fetchSubscriptionData()
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
        
      default:
        console.warn(`Unknown report type: ${reportType}`)
        return []
    }
  } catch (error) {
    console.error(`Error fetching report data for ${reportType}:`, error)
    return []
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

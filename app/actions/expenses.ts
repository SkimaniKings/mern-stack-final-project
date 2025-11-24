"use server"

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from "@/lib/supabase/server"

// Debug helper
const debug = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[EXPENSES_DEBUG] ${message}`, data || '')
  }
}

// Types
type Expense = {
  id: string
  user_id: string
  amount: number
  description: string
  category: string
  expense_date: string
  created_at: string
  updated_at: string
  location_name?: string
  latitude?: number
  longitude?: number
  warranty_expiration_date?: string
  is_split?: boolean
  split_ratio?: number
  [key: string]: any
}

type ExpenseInput = Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'user_id'> & {
  user_id?: string
}

type ExpenseResult = {
  data: Expense | null
  error: Error | null
}

type LocationSearchParams = {
  latitude?: number
  longitude?: number
  radius?: number
  radiusMeters?: number
  locationName?: string
}

/**
 * Get all expenses for the authenticated user
 */
export async function getExpenses(locationSearch?: LocationSearchParams): Promise<Expense[]> {
  try {
    debug('getExpenses called with:', { locationSearch })
    
    const supabase = await createServerSupabaseClient()
    debug('Supabase client created')
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    debug('Session data:', { hasSession: !!sessionData?.session, error: sessionError })
    
    if (sessionError || !sessionData?.session) {
      console.error('Error getting session:', sessionError || 'No active session')
      return []
    }
    
    const userId = sessionData.session.user.id
    debug('User ID:', userId)
    
    // Include split expenses in the query
    let query = supabase
      .from('expenses')
      .select(`
        *,
        splits:expense_splits(*)
      `)
      .eq('user_id', userId)
    
    if (locationSearch?.locationName) {
      query = query.ilike('location_name', `%${locationSearch.locationName}%`)
    }
    
    const { data: expenses, error: queryError } = await query.order('expense_date', { ascending: false })
    
    if (queryError) {
      console.error('Error fetching expenses:', queryError)
      return []
    }
    
    debug('Fetched expenses:', { count: expenses?.length })
    return expenses || []
  } catch (error) {
    console.error('Error in getExpenses:', error)
    return []
  }
}

/**
 * Get a single expense by ID
 */
export async function getExpenseById(id: string): Promise<Expense | null> {
  try {
    debug('getExpenseById called with ID:', id)
    const supabase = await createServerSupabaseClient()
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !sessionData?.session) {
      console.error('Error getting session:', sessionError || 'No active session')
      return null
    }
    
    const userId = sessionData.session.user.id
    // Include split expenses in the query
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select(`
        *,
        splits:expense_splits(*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (expenseError) {
      console.error('Error fetching expense:', expenseError)
      return null
    }
    
    return expense
  } catch (error) {
    console.error('Error in getExpenseById:', error)
    return null
  }
}

/**
 * Create a new expense
 */
export async function createExpense(expenseData: ExpenseInput): Promise<ExpenseResult> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !sessionData?.session) {
      return { data: null, error: new Error('Not authenticated') }
    }

    const userId = sessionData.session.user.id
    
    // Filter out undefined values and only include fields that have a value
    const cleanedExpenseData = Object.entries(expenseData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    // Define a safe set of default columns that we know should exist
    const defaultColumns = [
      'amount', 'description', 'category', 'expense_date', 'user_id', 
      'created_at', 'updated_at', 'location_name', 'merchant', 'notes',
      'payment_method', 'recurrence', 'is_impulse', 'tags', 'warranty_expiration_date',
      'receipt_url', 'is_tax_deductible', 'currency', 'category_ids'
      // Note: 'is_split' and 'note' are intentionally omitted as they don't exist in the database schema
    ];
    
    let validColumns = defaultColumns;
    
    try {
      // Try to get the actual columns from the database
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_columns', { table_name: 'expenses' });
        
      if (!tableError && tableInfo) {
        validColumns = tableInfo.map((col: any) => col.column_name);
      } else {
        console.warn('Could not get table schema, using default columns');
      }
    } catch (error) {
      console.warn('Error getting table schema, using default columns:', error);
    }
    
    // Only include valid columns that exist in the table
    const validExpenseData = Object.entries(cleanedExpenseData)
      .filter(([key]) => validColumns.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, any>);
    
    const newExpense = {
      ...validExpenseData,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: createdExpense, error: createError } = await supabase
      .from('expenses')
      .insert(newExpense)
      .select()
      .single()

    if (createError) {
      console.error('Error creating expense:', createError)
      return { data: null, error: createError }
    }

    revalidatePath('/expenses')
    return { data: createdExpense, error: null }
  } catch (error) {
    console.error('Error in createExpense:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update an existing expense
 */
export async function updateExpense(id: string, expenseData: Partial<ExpenseInput>): Promise<ExpenseResult> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !sessionData?.session) {
      return { data: null, error: new Error('Not authenticated') }
    }

    const userId = sessionData.session.user.id
    
    // Filter out undefined values and only include fields that have a value
    const cleanedExpenseData = Object.entries(expenseData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    const updatedExpense = {
      ...cleanedExpenseData,
      updated_at: new Date().toISOString()
    }

    // Define a whitelist of updatable columns to prevent unintended updates
    const validUpdateColumns = [
      'amount', 'description', 'category', 'expense_date', 'location_name', 
      'merchant', 'notes', 'payment_method', 'recurrence', 'is_impulse', 'tags', 
      'warranty_expiration_date', 'receipt_url', 'is_tax_deductible', 
      'currency', 'category_ids', 'updated_at'
    ];

    const updateData = Object.entries(updatedExpense)
      .filter(([key]) => validUpdateColumns.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, any>);

    const { data: updatedData, error: updateError } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating expense:', updateError)
      return { data: null, error: updateError }
    }

    revalidatePath('/expenses')
    return { data: updatedData, error: null }
  } catch (error) {
    console.error('Error in updateExpense:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Delete an expense
 */
export async function deleteExpense(id: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !sessionData?.session) {
      return { success: false, error: new Error('Not authenticated') }
    }

    const userId = sessionData.session.user.id
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting expense:', deleteError)
      return { success: false, error: deleteError }
    }

    revalidatePath('/expenses')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error in deleteExpense:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Create a split expense
 */
export async function createSplitExpense(
  expenseData: Omit<ExpenseInput, 'user_id' | 'split_ratio'>,
  splits: Array<{ userId: string; amount: number; percentage: number }>
): Promise<ExpenseResult> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !sessionData?.session) {
      return { data: null, error: new Error('Not authenticated') }
    }

    const userId = sessionData.session.user.id
    const splitExpense = {
      ...expenseData,
      user_id: userId,
      // Removed is_split as it's not in the database schema
      split_ratio: 100, // Keep split_ratio if it's used in your application logic
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: createdExpense, error: createError } = await supabase
      .from('expenses')
      .insert(splitExpense)
      .select()
      .single()

    if (createError) {
      console.error('Error creating split expense:', createError)
      return { data: null, error: createError }
    }

    revalidatePath('/expenses')
    return { data: createdExpense, error: null }
  } catch (error) {
    console.error('Error in createSplitExpense:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Search expenses by location
 */
export async function searchExpensesByLocation(
  params: LocationSearchParams
): Promise<Expense[]> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !sessionData?.session) {
      console.warn('No active session - user not authenticated')
      return []
    }

    const userId = sessionData.session.user.id
    
    // Include split expenses in the query
    let query = supabase
      .from('expenses')
      .select(`
        *,
        splits:expense_splits(*)
      `)
      .eq('user_id', userId)

    if (params.latitude && params.longitude) {
      query = query
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
    }

    if (params.locationName) {
      query = query.ilike('location_name', `%${params.locationName}%`)
    }

    const { data: expenses, error: queryError } = await query

    if (queryError) {
      console.error('Error searching expenses by location:', queryError)
      return []
    }

    return expenses || []
  } catch (error) {
    console.error('Error in searchExpensesByLocation:', error)
    return []
  }
}

/**
 * Get expenses grouped by time period
 */
export async function getExpensesByPeriod(
  period: 'day' | 'week' | 'month' | 'year',
  limit: number = 12
): Promise<Array<{ period_start: string; period_end: string; total: number; count: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !sessionData?.session) {
      console.warn('No active session - user not authenticated')
      return []
    }

    const userId = sessionData.session.user.id
    
    // Instead of using the database function, we'll implement the logic in JavaScript
    // First, get all expenses for the user
    const { data: userExpenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, amount, expense_date, category_ids')
      .eq('user_id', userId)
      .order('expense_date', { ascending: false })
    
    if (expensesError) {
      console.error('Error fetching expenses:', expensesError)
      return []
    }
    
    if (!userExpenses || userExpenses.length === 0) {
      return []
    }
    
    // Generate date ranges based on the period type and limit
    const dateRanges = generateDateRanges(period, limit)
    
    // Group expenses by period
    const result = dateRanges.map(range => {
      const expensesInPeriod = userExpenses.filter(expense => {
        const expenseDate = new Date(expense.expense_date)
        return expenseDate >= range.startDate && expenseDate < range.endDate
      })
      
      const total = expensesInPeriod.reduce((sum, expense) => sum + (expense.amount || 0), 0)
      
      return {
        period_start: range.startDate.toISOString().split('T')[0],
        period_end: range.endDate.toISOString().split('T')[0],
        total,
        count: expensesInPeriod.length
      }
    })
    
    return result
  } catch (error) {
    console.error('Error in getExpensesByPeriod:', error)
    return []
  }
}

/**
 * Helper function to generate date ranges based on period type and limit
 */
function generateDateRanges(periodType: 'day' | 'week' | 'month' | 'year', maxPeriods: number) {
  const ranges = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < maxPeriods; i++) {
    let startDate = new Date(today)
    let endDate = new Date(today)
    
    if (periodType === 'day') {
      startDate.setDate(today.getDate() - i)
      endDate.setDate(today.getDate() - i + 1)
    } else if (periodType === 'week') {
      startDate.setDate(today.getDate() - (7 * i))
      endDate.setDate(today.getDate() - (7 * i) + 7)
    } else if (periodType === 'month') {
      startDate.setMonth(today.getMonth() - i)
      startDate.setDate(1)
      endDate.setMonth(today.getMonth() - i + 1)
      endDate.setDate(1)
    } else if (periodType === 'year') {
      startDate.setFullYear(today.getFullYear() - i)
      startDate.setMonth(0)
      startDate.setDate(1)
      endDate.setFullYear(today.getFullYear() - i + 1)
      endDate.setMonth(0)
      endDate.setDate(1)
    }
    
    ranges.push({
      startDate,
      endDate
    })
  }
  
  return ranges
}

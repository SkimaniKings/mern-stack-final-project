"use server"

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { ALL_CATEGORIES, Category } from "@/lib/constants/categories"
import { notFound } from "next/navigation"
import { formatExpense, formatExpenseForCalendar, getExpenseSummaryByDay } from "@/lib/expense-utils"

// Import Database type from your Supabase types
type Database = any // Replace with your actual Database type

type Expense = Database['public']['Tables']['expenses']['Row']

type ExpenseInput = Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'user_id'> & {
  user_id?: string
}

type ExpenseResult = {
  data: Expense | null
  error: Error | null
}

// Interface for location search parameters
interface LocationSearchParams {
  latitude?: number
  longitude?: number
  radius?: number
  radiusMeters?: number
  locationName?: string
}

// Helper function to get Supabase client with error handling
async function getSupabaseClient() {
  const cookieStore = cookies()
  return createServerComponentClient<Database>({ 
    cookies: () => cookieStore 
  })
}

/**
 * Get all expenses for the authenticated user
 * @param locationSearch Optional location search parameters
 * @returns Promise<Expense[]> Array of expenses
 */
export async function getExpenses(locationSearch?: LocationSearchParams): Promise<Expense[]> {
  try {
    const supabase = await getSupabaseClient()
    
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No active session. User must be authenticated.')
    }
    
    const userId = session.user.id
    
    // Build the base query
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
    
    // Add location filter if provided
    if (locationSearch?.latitude && locationSearch?.longitude) {
      const radius = locationSearch.radiusMeters || (locationSearch.radius ? locationSearch.radius * 1000 : undefined)
      if (radius) {
        // This is a simplified version - you might need PostGIS for actual distance calculations
        console.log('Location-based filtering not fully implemented yet')
      }
    }
    
    // Add location name filter if provided
    if (locationSearch?.locationName) {
      query = query.ilike('location_name', `%${locationSearch.locationName}%`)
    }
    
    // Execute the query
    const { data, error } = await query.order('expense_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching expenses:', error)
      return []
    }
    
    // Map the data to Expense type with proper date handling
    return (data || []).map((expense: any) => ({
      ...expense,
      expense_date: new Date(expense.expense_date),
      created_at: new Date(expense.created_at),
      updated_at: new Date(expense.updated_at),
      warranty_expiration_date: expense.warranty_expiration_date 
        ? new Date(expense.warranty_expiration_date) 
        : null
    }))
    
  } catch (error) {
    console.error('Error in getExpenses:', error)
    return []
  }
}

/**
 * Create a new expense
 * @param expenseData Expense data to create
 * @returns Promise<ExpenseResult> The created expense or error
 */
export async function createExpense(expenseData: ExpenseInput): Promise<ExpenseResult> {
  try {
    const supabase = await getSupabaseClient()
    
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No active session. User must be authenticated.')
    }
    
    const userId = session.user.id
    
    // Add user ID to the expense data
    const expenseWithUser = {
      ...expenseData,
      user_id: userId
    }
    
    // Insert the new expense
    const { data, error } = await supabase
      .from('expenses')
      .insert(expenseWithUser)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating expense:', error)
      return { data: null, error: new Error(error.message) }
    }
    
    // Revalidate any relevant paths
    revalidatePath('/dashboard/expenses')
    
    return { 
      data: {
        ...data,
        expense_date: new Date(data.expense_date),
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
        warranty_expiration_date: data.warranty_expiration_date 
          ? new Date(data.warranty_expiration_date) 
          : null
      }, 
      error: null 
    }
    
  } catch (error) {
    console.error('Error in createExpense:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Failed to create expense') 
    }
  }
}

/**
 * Update an existing expense
 * @param id Expense ID to update
 * @param expenseData Updated expense data
 * @returns Promise<ExpenseResult> The updated expense or error
 */
export async function updateExpense(id: string, expenseData: Partial<ExpenseInput>): Promise<ExpenseResult> {
  try {
    const supabase = await getSupabaseClient()
    
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No active session. User must be authenticated.')
    }
    
    // Update the expense
    const { data, error } = await supabase
      .from('expenses')
      .update({
        ...expenseData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', session.user.id) // Ensure user owns the expense
      .select()
      .single()
    
    if (error) {
      console.error('Error updating expense:', error)
      return { data: null, error: new Error(error.message) }
    }
    
    // Revalidate any relevant paths
    revalidatePath('/dashboard/expenses')
    revalidatePath(`/dashboard/expenses/${id}`)
    
    return { 
      data: {
        ...data,
        expense_date: new Date(data.expense_date),
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
        warranty_expiration_date: data.warranty_expiration_date 
          ? new Date(data.warranty_expiration_date) 
          : null
      }, 
      error: null 
    }
    
  } catch (error) {
    console.error('Error in updateExpense:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Failed to update expense') 
    }
  }
}

/**
 * Delete an expense
 * @param id Expense ID to delete
 * @returns Promise<{ success: boolean; error: Error | null }> Success status and error if any
 */
export async function deleteExpense(id: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = await getSupabaseClient()
    
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No active session. User must be authenticated.')
    }
    
    // Delete the expense
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id) // Ensure user owns the expense
    
    if (error) {
      console.error('Error deleting expense:', error)
      return { success: false, error: new Error(error.message) }
    }
    
    // Revalidate any relevant paths
    revalidatePath('/dashboard/expenses')
    revalidatePath(`/dashboard/expenses/${id}`)
    
    return { success: true, error: null }
    
  } catch (error) {
    console.error('Error in deleteExpense:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Failed to delete expense') 
    }
  }
}

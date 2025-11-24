"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
// Import types for Supabase

// Helper function to get the current user
async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null
  
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

// Update an investment
export async function updateInvestment(investmentData: {
  id: string
  name: string
  ticker?: string
  type?: string
  value: number
  cost_basis?: number
  quantity?: number
  initial_price?: number
  current_price?: number
  purchase_date?: string
  currency?: string
  account?: string
}) {
  try {
    // Ensure the user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Create a Supabase client
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return { success: false, error: "Failed to create Supabase client" }
    }
    
    // First, let's call the database setup endpoint to ensure all columns exist
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/database/setup-investments`, {
        method: 'GET',
      })
    } catch (setupError) {
      console.warn('Database setup warning:', setupError)
      // Continue even if setup fails
    }

    // Update the investment
    // Only include fields that exist in the database schema to avoid errors
    const { data, error } = await (supabase as any)
      .from('investments')
      .update({
        name: investmentData.name,
        ticker: investmentData.ticker,
        type: investmentData.type,
        value: investmentData.value,
        cost_basis: investmentData.cost_basis,
        quantity: investmentData.quantity,
        initial_price: investmentData.initial_price,
        current_price: investmentData.current_price,
        // Removed purchase_date field as it might not exist in the database schema yet
        currency: investmentData.currency,
        updated_at: new Date().toISOString()
      })
      .eq('id', investmentData.id)
      .eq('user_id', user.id)
      .select()
    
    if (error) {
      console.error("Error updating investment:", error)
      return { success: false, error: error.message }
    }
    
    // If account information is provided, update the investment account
    if (investmentData.account) {
      // Import the updateInvestmentAccount function
      const { updateInvestmentAccount } = await import('./investment-accounts')
      
      // Update the investment account
      const accountResult = await updateInvestmentAccount({
        investment_id: investmentData.id,
        account_name: investmentData.account,
        account_type: investmentData.account
      })
      
      if (!accountResult.success) {
        console.warn("Warning: Failed to update investment account:", accountResult.error)
        // Continue with the investment update even if the account update fails
      }
    }
    
    // Revalidate the investments page to reflect the changes
    revalidatePath('/investments/portfolio')
    
    return { success: true, data }
  } catch (error) {
    console.error("Error in updateInvestment:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Delete an investment
export async function deleteInvestment(investmentId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return { success: false, error: "Failed to create Supabase client" }
    }
    
    // Delete the investment
    const { error } = await (supabase as any)
      .from('investments')
      .delete()
      .eq('id', investmentId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error("Error deleting investment:", error)
      return { success: false, error: error.message }
    }
    
    // Revalidate the investments page to reflect the changes
    revalidatePath('/investments/portfolio')
    
    return { success: true }
  } catch (error) {
    console.error("Error in deleteInvestment:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

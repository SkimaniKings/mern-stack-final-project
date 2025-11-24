"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Helper function to get the current user
async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null
  
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

// Set up the database schema for investment accounts
async function setupDatabase() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/database/setup-investments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const result = await response.json()
    return result.success
  } catch (error) {
    console.error('Error setting up database:', error)
    return false
  }
}

// Create or update an investment account
export async function updateInvestmentAccount(data: {
  investment_id: string
  account_name: string
  account_type: string
}) {
  try {
    // Ensure the user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Set up the database schema if needed
    const setupSuccess = await setupDatabase()
    if (!setupSuccess) {
      console.warn("Database setup may have failed, but continuing with operation")
    }

    // Create a Supabase client
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return { success: false, error: "Failed to create Supabase client" }
    }
    
    // Check if an account already exists for this investment
    const { data: existingAccount, error: fetchError } = await (supabase as any)
      .from('investment_accounts')
      .select('*')
      .eq('investment_id', data.investment_id)
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (fetchError && fetchError.code !== 'PGRST204') {
      console.error("Error fetching existing account:", fetchError)
      return { success: false, error: fetchError.message }
    }
    
    let result
    
    if (existingAccount) {
      // Update the existing account
      const { data: updatedAccount, error: updateError } = await (supabase as any)
        .from('investment_accounts')
        .update({
          account_name: data.account_name,
          account_type: data.account_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id)
        .select()
      
      if (updateError) {
        console.error("Error updating investment account:", updateError)
        return { success: false, error: updateError.message }
      }
      
      result = updatedAccount
    } else {
      // Create a new account
      const { data: newAccount, error: insertError } = await (supabase as any)
        .from('investment_accounts')
        .insert({
          investment_id: data.investment_id,
          user_id: user.id,
          account_name: data.account_name,
          account_type: data.account_type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
      
      if (insertError) {
        // Handle duplicate key error (account already exists)
        if (insertError.code === '23505') {
          console.log("Account already exists, this is likely a race condition")
          
          // Try to fetch the existing account
          const { data: existingAcc } = await (supabase as any)
            .from('investment_accounts')
            .select('*')
            .eq('investment_id', data.investment_id)
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (existingAcc) {
            return { success: true, data: existingAcc }
          }
        }
        
        console.error("Error creating investment account:", insertError)
        return { success: false, error: insertError.message }
      }
      
      result = newAccount
    }
    
    // Revalidate the investments page to reflect the changes
    revalidatePath('/investments/portfolio')
    
    return { success: true, data: result }
  } catch (error) {
    console.error("Error in updateInvestmentAccount:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Get an investment account by investment ID
export async function getInvestmentAccount(investmentId: string) {
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
    
    // Fetch the account
    const { data, error } = await (supabase as any)
      .from('investment_accounts')
      .select('*')
      .eq('investment_id', investmentId)
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (error && error.code !== 'PGRST204') {
      console.error("Error fetching investment account:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error("Error in getInvestmentAccount:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth"

export async function getAccounts() {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    console.error("Failed to initialize Supabase client")
    return []
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase.from("accounts").select("*").eq("user_id", user.id).order("name")

  if (error) {
    console.error("Error fetching accounts:", error)
    return []
  }

  // Get cash flow data for each account
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized")
    }
    
    const { data: cashFlowData, error: cashFlowError } = await supabase
      .from("net_cash_position_view")
      .select("*")
      .eq("user_id", user.id)

    if (!cashFlowError && cashFlowData) {
      // Enhance account data with cash flow information
      return data.map(account => {
        const cashFlow = cashFlowData.find(cf => cf.account_id === account.id) || {
          total_inflow: 0,
          total_outflow: 0,
          net_cash_position: 0
        }
        
        return {
          ...account,
          total_inflow: cashFlow.total_inflow || 0,
          total_outflow: cashFlow.total_outflow || 0,
          net_cash_position: cashFlow.net_cash_position || 0
        }
      })
    }
  } catch (cashFlowError) {
    console.error("Error fetching cash flow data:", cashFlowError)
  }

  return data
}

export async function getAccountById(id: string) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    console.error("Failed to initialize Supabase client")
    return null
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase.from("accounts").select("*").eq("id", id).eq("user_id", user.id).single()

  if (error) {
    console.error("Error fetching account:", error)
    return null
  }

  return data
}

export async function createAccount(formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }

    // Get the user directly from Supabase auth
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting user:", userError)
      throw new Error("Authentication required")
    }

    // Log the user ID to verify it's in the correct format
    console.log("User ID:", user.id)
    
    // Check if the user ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user.id)) {
      console.error("Invalid user ID format:", user.id)
      throw new Error("Invalid user ID format")
    }

    // Extract form data
    const name = formData.get("name") as string
    const accountType = formData.get("account_type") as string
    const balance = Number(formData.get("balance")) || 0
    const currency = (formData.get("currency") as string) || "USD"
    const institution = (formData.get("institution") as string) || ""
    const accountNumber = (formData.get("account_number") as string) || ""
    const notes = (formData.get("notes") as string) || ""
    const isActive = formData.get("is_active") === "true"
    const isPrimary = formData.get("is_primary") === "true"

    // Validate required fields
    if (!name || !accountType) {
      throw new Error("Name and account type are required")
    }

    // Validate account type against allowed values
    const validAccountTypes = ['checking', 'savings', 'credit_card', 'investment', 'loan', 'cash', 'other']
    if (!validAccountTypes.includes(accountType)) {
      throw new Error(`Invalid account type. Must be one of: ${validAccountTypes.join(', ')}`)
    }

    // Log the data being inserted
    console.log("Creating account with data:", {
      user_id: user.id,
      name,
      account_type: accountType,
      balance,
      currency,
      institution,
      account_number: accountNumber,
      is_active: isActive,
      is_primary: isPrimary
    })

    // Create account
    if (!supabase) {
      throw new Error("Supabase client is not initialized")
    }
    
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name,
        account_type: accountType,
        balance,
        currency,
        institution,
        account_number: accountNumber,
        is_active: isActive,
        is_primary: isPrimary
      })
      .select()

    if (error) {
      console.error("Error creating account:", error)
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw new Error(`Failed to create account: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error("No data returned after account creation")
    }

    // Revalidate accounts page
    revalidatePath("/accounts")

    return data[0]
  } catch (error) {
    console.error("Error in createAccount:", error)
    throw error
  }
}

export async function updateAccount(id: string, formData: FormData) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  // Extract form data
  const name = formData.get("name") as string
  const accountType = formData.get("account_type") as string
  const balance = Number.parseFloat(formData.get("balance") as string) || 0
  const currency = (formData.get("currency") as string) || "USD"
  const institution = (formData.get("institution") as string) || ""
  const accountNumber = (formData.get("account_number") as string) || ""
  const notes = (formData.get("notes") as string) || ""
  const isActive = formData.get("is_active") === "true"
  const isPrimary = formData.get("is_primary") === "true"

  // Validate required fields
  if (!name || !accountType) {
    throw new Error("Name and account type are required")
  }

  // Validate account type against allowed values
  const validAccountTypes = ['checking', 'savings', 'credit_card', 'investment', 'loan', 'cash', 'other']
  if (!validAccountTypes.includes(accountType)) {
    throw new Error(`Invalid account type. Must be one of: ${validAccountTypes.join(', ')}`)
  }

  // Update account
  if (!supabase) {
    throw new Error("Supabase client is not initialized")
  }
  
  const { data, error } = await supabase
    .from("accounts")
    .update({
      name,
      account_type: accountType,
      balance,
      currency,
      institution,
      account_number: accountNumber,
      is_active: isActive,
      is_primary: isPrimary,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()

  if (error) {
    console.error("Error updating account:", error)
    throw new Error("Failed to update account")
  }

  // Revalidate accounts page
  revalidatePath("/accounts")

  return data[0]
}

export async function deleteAccount(id: string) {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  // Delete account
  if (!supabase) {
    throw new Error("Supabase client is not initialized")
  }
  
  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id)

  if (error) {
    console.error("Error deleting account:", error)
    throw new Error("Failed to delete account")
  }

  // Revalidate accounts page
  revalidatePath("/accounts")
}

export async function getAccountSummary() {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    console.error("Failed to initialize Supabase client")
    return {
      totalBalance: 0,
      accountCount: 0,
      currencyBreakdown: {},
      typeBreakdown: {}
    }
  }

  const user = await getAuthenticatedUser()

  if (!user) {
    return {
      totalBalance: 0,
      accountCount: 0,
      currencyBreakdown: {},
      typeBreakdown: {}
    }
  }

  // Use the account_balances_summary view from the SQL schema
  if (!supabase) {
    throw new Error("Supabase client is not initialized")
  }
  
  const { data: summaryData, error: summaryError } = await supabase
    .from("account_balances_summary")
    .select("*")
    .eq("user_id", user.id)

  if (summaryError) {
    console.error("Error fetching account summary from view:", summaryError)
    
    // Fallback to direct query if the view doesn't work
    if (!supabase) {
      throw new Error("Supabase client is not initialized")
    }
    
    const { data, error } = await supabase
      .from("accounts")
      .select("account_type, balance, currency")
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (error) {
      console.error("Error fetching account summary:", error)
      return {
        totalBalance: 0,
        accountCount: 0,
        currencyBreakdown: {},
        typeBreakdown: {}
      }
    }

    // Calculate total balance across all accounts
    let totalBalance = 0;
    const currencyBreakdown: Record<string, number> = {};
    const typeBreakdown: Record<string, number> = {};

    // Process the data
    data.forEach(account => {
      // Add to total balance (note: this assumes all currencies are converted to a base currency)
      totalBalance += account.balance;

      // Add to currency breakdown
      if (!currencyBreakdown[account.currency]) {
        currencyBreakdown[account.currency] = 0;
      }
      currencyBreakdown[account.currency] += account.balance;

      // Add to type breakdown
      if (!typeBreakdown[account.account_type]) {
        typeBreakdown[account.account_type] = 0;
      }
      typeBreakdown[account.account_type] += account.balance;
    });

    return {
      totalBalance,
      accountCount: data.length,
      currencyBreakdown,
      typeBreakdown
    }
  }

  // Process the summary data from the view
  let totalBalance = 0;
  const typeBreakdown: Record<string, number> = {};

  summaryData.forEach(item => {
    totalBalance += item.total_balance;
    typeBreakdown[item.account_type] = item.total_balance;
  });

  // Get currency breakdown (not available directly from the view)
  if (!supabase) {
    throw new Error("Supabase client is not initialized")
  }
  
  const { data: currencyData, error: currencyError } = await supabase
    .from("accounts")
    .select("currency, balance")
    .eq("user_id", user.id)
    .eq("is_active", true)

  const currencyBreakdown: Record<string, number> = {};
  
  if (!currencyError && currencyData) {
    currencyData.forEach(account => {
      if (!currencyBreakdown[account.currency]) {
        currencyBreakdown[account.currency] = 0;
      }
      currencyBreakdown[account.currency] += account.balance;
    });
  }

  return {
    totalBalance,
    accountCount: summaryData.length,
    currencyBreakdown,
    typeBreakdown
  }
}


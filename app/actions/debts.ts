"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth"

export interface Debt {
  id: string
  name: string
  type: string
  principal: number
  interest_rate: number
  minimum_payment: number
  due_date?: string
  start_date?: string
  term_months?: number
}

// Get all debts for the current user
export async function getDebts() {
  try {
    const user = await getAuthenticatedUser()
    const userId = user?.id
    
    if (!userId) {
      console.error("getDebts: User not authenticated")
      // Return empty array instead of throwing an error
      return []
    }
    
    console.log("getDebts: Fetching debts for user", userId)
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("getDebts: Failed to create Supabase client")
      return []
    }

    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching debts:", error)
      // Return empty array instead of throwing an error
      return []
    }

    console.log(`getDebts: Found ${data?.length || 0} debts`)
    return data || []
  } catch (error) {
    console.error("Unexpected error in getDebts:", error)
    // Return empty array instead of throwing an error
    return []
  }
}

// Get a specific debt by ID
export async function getDebtById(id: string) {
  try {
    const user = await getAuthenticatedUser()
    const userId = user?.id
    
    if (!userId) {
      console.error("getDebtById: User not authenticated")
      // Return null instead of throwing an error
      return null
    }
    
    console.log(`getDebtById: Fetching debt ${id} for user ${userId}`)
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("getDebtById: Failed to create Supabase client")
      return null
    }

    // First try with exact user match
    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching debt:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getDebtById:", error)
    return null
  }
}

// Create a new debt
export async function createDebt(formData: FormData) {
  try {
    console.log("createDebt: Starting debt creation process")
    const user = await getAuthenticatedUser()
    const userId = user?.id
    
    if (!userId) {
      console.error("createDebt: User not authenticated")
      throw new Error("User not authenticated")
    }
    
    console.log("createDebt: Got authenticated user", userId)
    const supabase = await createServerSupabaseClient()
    console.log("createDebt: Created Supabase client")

    // Validate and extract form data
    const name = formData.get("name") as string
    if (!name || name.trim() === "") {
      console.error("createDebt: Name is required")
      throw new Error("Name is required")
    }

    let type = formData.get("type") as string
    console.log("createDebt: Original type value:", type)
    
    // Ensure type matches one of the allowed values in the database constraint
    // The database expects: credit_card, mortgage, auto, student, personal, medical, other
    const typeMapping: Record<string, string> = {
      "credit-card": "credit_card",
      "auto-loan": "auto",
      "student-loan": "student",
      "personal-loan": "personal"
    }
    
    // If the type contains hyphens, map it to the underscore version
    if (type.includes('-')) {
      type = typeMapping[type] || type.replace('-', '_');
      console.log("createDebt: Mapped type value:", type)
    }
    
    const principal = Number.parseFloat(formData.get("principal") as string || formData.get("balance") as string)
    if (isNaN(principal) || principal < 0) {
      console.error("createDebt: Invalid principal value", formData.get("principal"))
      throw new Error("Principal/Balance must be a valid positive number")
    }

    const interestRate = Number.parseFloat(formData.get("interest_rate") as string || formData.get("interestRate") as string)
    if (isNaN(interestRate) || interestRate < 0) {
      console.error("createDebt: Invalid interest rate", formData.get("interest_rate"))
      throw new Error("Interest rate must be a valid positive number")
    }

    const minimumPayment = Number.parseFloat(formData.get("minimum_payment") as string || formData.get("minimumPayment") as string)
    
    // Optional fields
    const dueDateStr = formData.get("due_date") as string || null
    const startDateStr = formData.get("start_date") as string || null
    const termMonthsStr = formData.get("term_months") as string
    const termMonths = termMonthsStr ? parseInt(termMonthsStr) : null

    // Validate that type is one of the allowed values
    const validTypes = ['credit_card', 'mortgage', 'auto', 'student', 'personal', 'medical', 'other'];
    if (!validTypes.includes(type)) {
      console.error("createDebt: Invalid debt type after mapping", type);
      throw new Error(`Invalid debt type. Must be one of: ${validTypes.join(', ')}`);
    }
    console.log("createDebt: Validated type value:", type);

    // Create debt object matching the database schema
    const debtData = {
      id: formData.get("id") as string || crypto.randomUUID(),
      user_id: userId,
      name,
      type, // Use type as-is to match the database constraint
      principal: principal, // Use principal to match the database column name
      balance: principal, // Keep balance for backward compatibility
      original_balance: principal, // Set original balance to match current balance for new debt
      interest_rate: interestRate,
      minimum_payment: minimumPayment,
      actual_payment: minimumPayment, // Default actual payment to minimum payment
      due_date: dueDateStr || null, // Use the full date string instead of just the day
      start_date: startDateStr || new Date().toISOString().split('T')[0], // Default to today if not provided
      estimated_payoff_date: null,
      lender: formData.get("lender") as string || null,
      account_number: formData.get("account_number") as string || null,
      notes: formData.get("notes") as string || null,
      payment_method_id: null, // Default to null for now
      autopay: false, // Default to false
    }

    console.log("createDebt: Prepared debt data for insertion", debtData)

    // Insert new debt into database
    const { data, error } = await supabase.from("debts").insert(debtData).select()

    if (error) {
      console.error("Error creating debt:", error)
      throw new Error(`Failed to create debt: ${error.message}`)
    }

    console.log("createDebt: Successfully inserted debt", data)

    // Revalidate paths to update UI
    revalidatePath("/debt-management")
    return { id: debtData.id, success: true }
  } catch (error) {
    console.error("Unexpected error in createDebt:", error)
    if (error instanceof Error) {
      throw new Error(`Failed to create debt: ${error.message}`)
    }
    throw new Error("Failed to create debt")
  }
}

// Update an existing debt
export async function updateDebt(id: string, formData: FormData) {
  try {
    console.log(`updateDebt: Starting update for debt ${id}`)
    const user = await getAuthenticatedUser()
    const userId = user?.id
    
    if (!userId) {
      console.error("updateDebt: User not authenticated")
      throw new Error("User not authenticated")
    }
    
    console.log(`updateDebt: Got authenticated user ${userId}`)
    const supabase = await createServerSupabaseClient()

    // Check if debt exists and belongs to user
    const { data: existingDebt, error: fetchError } = await supabase
      .from("debts")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError) {
      console.error("Error fetching debt:", fetchError)
      throw new Error("Database error while checking debt")
    }

    if (!existingDebt) {
      console.error("Debt not found or access denied:", id)
      throw new Error("Debt not found or access denied")
    }

    console.log(`updateDebt: Found existing debt`, existingDebt)

    // Validate and extract form data
    const name = formData.get("name") as string
    if (!name || name.trim() === "") {
      throw new Error("Name is required")
    }

    const type = formData.get("type") as string
    const principal = Number.parseFloat(formData.get("principal") as string || formData.get("balance") as string)
    if (isNaN(principal) || principal < 0) {
      throw new Error("Principal/Balance must be a valid positive number")
    }

    const interestRate = Number.parseFloat(formData.get("interest_rate") as string || formData.get("interestRate") as string)
    if (isNaN(interestRate) || interestRate < 0) {
      throw new Error("Interest rate must be a valid positive number")
    }

    const minimumPayment = Number.parseFloat(formData.get("minimum_payment") as string || formData.get("minimumPayment") as string)
    
    // Optional fields
    const dueDateStr = formData.get("due_date") as string || null
    const startDateStr = formData.get("start_date") as string || null
    const termMonthsStr = formData.get("term_months") as string
    const termMonths = termMonthsStr ? parseInt(termMonthsStr) : null

    // Create update payload
    const updateData = {
      name,
      type: type.replace('-', '_'), // Ensure format matches schema CHECK constraint
      principal,
      interest_rate: interestRate,
      minimum_payment: minimumPayment,
      due_date: dueDateStr,
      start_date: startDateStr,
      term_months: termMonths,
    }

    console.log(`updateDebt: Prepared update data`, updateData)

    // Update debt in database
    const { data, error: updateError } = await supabase
      .from("debts")
      .update(updateData)
      .eq("id", id)
      .select()

    if (updateError) {
      console.error("Error updating debt:", updateError)
      throw new Error(`Failed to update debt: ${updateError.message}`)
    }

    console.log(`updateDebt: Successfully updated debt`, data)

    // Revalidate paths to update UI
    revalidatePath("/debt-management")
    return { id, success: true }
  } catch (error) {
    console.error("Unexpected error in updateDebt:", error)
    if (error instanceof Error) {
      throw new Error(`Failed to update debt: ${error.message}`)
    }
    throw new Error("Failed to update debt")
  }
}

// Delete a debt
export async function deleteDebt(id: string) {
  try {
    console.log(`deleteDebt: Starting deletion of debt ${id}`)
    const user = await getAuthenticatedUser()
    const userId = user?.id
    
    if (!userId) {
      console.error("deleteDebt: User not authenticated")
      throw new Error("User not authenticated")
    }
    
    console.log(`deleteDebt: Got authenticated user ${userId}`)
    const supabase = await createServerSupabaseClient()

    // Verify debt belongs to user before deletion
    const { data: existingDebt, error: fetchError } = await supabase
      .from("debts")
      .select("user_id")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) {
      console.error("Error fetching debt for deletion:", fetchError)
      throw new Error("Database error while checking debt")
    }

    if (!existingDebt) {
      console.error("Debt not found for deletion:", id)
      throw new Error("Debt not found")
    }

    if (existingDebt.user_id !== userId) {
      console.error("Access denied for debt deletion:", id)
      throw new Error("Access denied for this debt")
    }

    console.log(`deleteDebt: Verified ownership, proceeding with deletion`)

    // Delete the debt
    const { data, error: deleteError } = await supabase
      .from("debts")
      .delete()
      .eq("id", id)
      .select()

    if (deleteError) {
      console.error("Error deleting debt:", deleteError)
      throw new Error(`Failed to delete debt: ${deleteError.message}`)
    }

    console.log(`deleteDebt: Successfully deleted debt`, data)

    // Revalidate paths to update UI
    revalidatePath("/debt-management")
    return { success: true }
  } catch (error) {
    console.error("Unexpected error in deleteDebt:", error)
    if (error instanceof Error) {
      throw new Error(`Failed to delete debt: ${error.message}`)
    }
    throw new Error("Failed to delete debt")
  }
}

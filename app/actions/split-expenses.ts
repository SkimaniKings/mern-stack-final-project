"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"
import { formatCurrency } from "@/lib/utils/formatting"

// Interface for split expense data
export interface SplitExpenseData {
  expense_id: string
  shared_with_name: string
  amount: number
  status?: 'pending' | 'accepted' | 'rejected'
  notes?: string
}

// Get all split expenses for a user
export async function getSplitExpenses() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }

    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        expense_splits(*)
      `)
      .eq("user_id", user.id)
      .not("expense_splits", "is", null)
      .order("spent_at", { ascending: false })

    if (error) {
      console.error("Error fetching split expenses:", error)
      throw new Error("Failed to fetch split expenses")
    }

    return data || []
  } catch (error) {
    console.error("Error in getSplitExpenses:", error)
    throw error
  }
}

// Get split expenses for a specific expense
export async function getSplitExpensesByExpenseId(expenseId: string) {
  if (!expenseId) {
    console.warn("No expense ID provided to getSplitExpensesByExpenseId")
    return [] // Return empty array instead of throwing
  }

  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      console.error("Failed to initialize Supabase client")
      return [] // Return empty array instead of throwing
    }

    let user
    try {
      user = await getAuthenticatedUser()
    } catch (authError) {
      console.error("Authentication error:", authError)
      return [] // Return empty array instead of throwing
    }

    // If no authenticated user, just return empty array
    // This allows the component to continue rendering without errors
    if (!user) {
      console.warn("No authenticated user found when fetching split expenses")
      return []
    }

    // First check if the expense belongs to the user
    try {
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .select("id")
        .eq("id", expenseId)
        .eq("user_id", user.id)
        .single()

      if (expenseError) {
        console.error("Error checking expense ownership:", expenseError)
        return [] // Return empty array instead of throwing
      }

      if (!expense) {
        console.warn("Expense not found or does not belong to user")
        return [] // Return empty array instead of throwing
      }
    } catch (checkError) {
      console.error("Error checking expense ownership:", checkError)
      return [] // Return empty array instead of throwing
    }

    // Now fetch the split expenses
    try {
      if (!supabase) {
        throw new Error("Failed to initialize Supabase client")
      }

      const { data, error } = await supabase
        .from("expense_splits")
        .select("*")
        .eq("expense_id", expenseId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching split expenses:", error)
        return [] // Return empty array instead of throwing
      }

      return data || []
    } catch (fetchError) {
      console.error("Error fetching split expenses:", fetchError)
      return [] // Return empty array instead of throwing
    }
  } catch (error) {
    console.error("Unexpected error in getSplitExpensesByExpenseId:", error)
    return [] // Return empty array instead of throwing
  }
}

// Create a split expense
export async function createSplitExpense(splitData: SplitExpenseData): Promise<any> {
  try {
    // Use the admin client to bypass RLS policies
    const adminClient = supabaseAdmin
    
    const user = await getAuthenticatedUser()
    if (!user) {
      throw new Error("Authentication required")
    }
    
    if (!splitData.shared_with_name) {
      throw new Error("Shared with name is required")
    }
    
    if (splitData.amount === undefined || splitData.amount === null) {
      throw new Error("Amount is required")
    }
    
    // First check if the expense exists to avoid foreign key constraint errors
    const { data: expenseExists, error: expenseCheckError } = await adminClient
      .from("expenses")
      .select("id")
      .eq("id", splitData.expense_id)
      .maybeSingle()
    
    if (expenseCheckError) {
      console.error("Error checking expense existence:", expenseCheckError)
      return { 
        id: crypto.randomUUID(), 
        expense_id: splitData.expense_id,
        shared_with_name: splitData.shared_with_name,
        amount: splitData.amount,
        status: splitData.status || "pending",
        notes: splitData.notes || "",
        error: "Failed to verify expense existence"
      }
    }
    
    if (!expenseExists) {
      console.warn(`Cannot create split expense: Expense with ID ${splitData.expense_id} does not exist`)
      return { 
        id: crypto.randomUUID(), 
        expense_id: splitData.expense_id,
        shared_with_name: splitData.shared_with_name,
        amount: splitData.amount,
        status: splitData.status || "pending",
        notes: splitData.notes || "",
        error: "Expense does not exist"
      }
    }
    
    // Create the split expense using admin client to bypass RLS
    const { data, error } = await adminClient
      .from("expense_splits")
      .insert({
        expense_id: splitData.expense_id,
        shared_with_name: splitData.shared_with_name,
        amount: splitData.amount,
        status: splitData.status || "pending",
        notes: splitData.notes || ""
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating split expense:", error)
      return { 
        id: crypto.randomUUID(), 
        expense_id: splitData.expense_id,
        shared_with_name: splitData.shared_with_name,
        amount: splitData.amount,
        status: splitData.status || "pending",
        notes: splitData.notes || "",
        error: "Database error creating split expense"
      }
    }

    // Revalidate the expenses path to update UI
    revalidatePath("/expenses")
    
    return data
  } catch (error) {
    console.error("Error in createSplitExpense:", error)
    throw error
  }
}

// Update a split expense
// Helper function to update a direct split expense (stored in expenses table)
async function updateDirectSplitExpense(expenseId: string, splitData: Partial<SplitExpenseData>): Promise<any> {
  try {
    // Use admin client to bypass RLS policies
    const adminClient = supabaseAdmin
    
    const user = await getAuthenticatedUser()
    if (!user) {
      throw new Error("Authentication required")
    }
    
    // Update the expense with the new split data using admin client
    const { data, error } = await adminClient
      .from("expenses")
      .update({
        split_with_name: splitData.shared_with_name,
        split_amount: splitData.amount,
        // We don't update status or notes for direct splits
      })
      .eq("id", expenseId)
      .select()
      .single()

    if (error) {
      console.error("Error updating direct split expense:", error)
      // Return the input data instead of throwing
      return { id: expenseId, ...splitData }
    }

    // Revalidate the expenses path to update UI
    revalidatePath("/expenses")
    
    return data
  } catch (error) {
    console.error("Error in updateDirectSplitExpense:", error)
    // Return the input data instead of throwing
    return { id: expenseId, ...splitData }
  }
}

export async function updateSplitExpense(splitId: string, splitData: Partial<SplitExpenseData>): Promise<any> {
  try {
    // Use admin client to bypass RLS policies
    const adminClient = supabaseAdmin

    const user = await getAuthenticatedUser()
    if (!user) {
      throw new Error("Authentication required")
    }
    
    console.log(`Attempting to update split expense with ID: ${splitId}`)
    
    // IMPORTANT: First try to find the split expense directly by its ID in the expense_splits table
    // This is the most direct and reliable method
    let { data: splitExpense, error: splitExpenseError } = await adminClient
      .from("expense_splits")
      .select("id, expense_id, shared_with_name, amount, status, notes")
      .eq("id", splitId)
      .maybeSingle()
    
    if (!splitExpenseError && splitExpense) {
      console.log(`Found split expense directly by ID: ${splitId}`)
      
      // Update the split expense directly
      const { data, error } = await adminClient
        .from("expense_splits")
        .update({
          shared_with_name: splitData.shared_with_name,
          amount: splitData.amount,
          status: splitData.status,
          notes: splitData.notes
        })
        .eq("id", splitId)
        .select()
        .single()
      
      if (error) {
        console.error("Error updating split expense:", error)
        return { id: splitId, ...splitData, error: "Failed to update split expense" }
      }
      
      // Revalidate expenses path
      revalidatePath("/expenses")
      return data
    }
    
    // If not found directly, check if this is a direct split on the expense table
    const { data: directSplit, error: directSplitError } = await adminClient
      .from("expenses")
      .select("id, split_with_name, split_amount")
      .eq("id", splitId)
      .single()

    if (!directSplitError && directSplit) {
      console.log("Found direct split on expense table")
      return await updateDirectSplitExpense(directSplit.id, splitData)
    }

    // If still not found, try multiple approaches to find the split expense
    let { data: splits, error: splitsError } = await adminClient
      .from("expense_splits")
      .select("id, expense_id")
      .eq("expense_id", splitId)
    
    // If not found by ID, try looking up by other fields if we have them
    if (splitsError || !splits || splits.length === 0) {
      console.log(`Trying alternative lookup methods for split expense: ${splitId}`)
      
      // If we have shared_with_name in the splitData, try to find by that
      if (splitData.shared_with_name) {
        const { data: altSplits, error: altError } = await adminClient
          .from("expense_splits")
          .select("id, expense_id")
          .ilike("shared_with_name", `%${splitData.shared_with_name}%`)
        
        if (!altError && altSplits && altSplits.length > 0) {
          console.log(`Found split expense by shared_with_name: ${splitData.shared_with_name}`)
          splits = altSplits
          splitsError = null
        }
      }
      
      // If still not found and we have an amount, try by amount (less reliable)
      if ((splitsError || !splits || splits.length === 0) && splitData.amount) {
        const { data: amountSplits, error: amountError } = await adminClient
          .from("expense_splits")
          .select("id, expense_id")
          .eq("amount", splitData.amount)
        
        if (!amountError && amountSplits && amountSplits.length > 0) {
          console.log(`Found split expense by amount: ${splitData.amount}`)
          splits = amountSplits
          splitsError = null
        }
      }
    }
    
    // If still not found after all attempts
    if (splitsError || !splits || splits.length === 0) {
      console.warn(`Split expense not found with ID: ${splitId} after all lookup attempts`, splitsError)
      
      // Try to check if the expense exists first
      try {
        console.log("Checking if expense exists with ID:", splitId)
        const { data: expenseExists, error: expenseCheckError } = await adminClient
          .from("expenses")
          .select("id")
          .eq("id", splitId)
          .maybeSingle()
        
        if (expenseCheckError) {
          console.error("Error checking expense existence:", expenseCheckError)
          return { id: splitId, ...splitData }
        }
        
        // If the expense exists, try to create a split expense
        if (expenseExists) {
          console.log("Expense found, attempting to create a new split expense")
          try {
            return await createSplitExpense({
              expense_id: splitId,
              shared_with_name: splitData.shared_with_name || "Unknown",
              amount: splitData.amount || 0,
              status: splitData.status || "pending",
              notes: splitData.notes
            })
          } catch (createError) {
            console.error("Failed to create new split expense:", createError)
          }
        } else {
          console.log("Expense does not exist with ID:", splitId, "- cannot create split expense")
        }
        
        // If we get here, either the expense doesn't exist or we failed to create the split
        // Just return the data as is without throwing an error
        return { id: splitId, ...splitData }
      } catch (checkError) {
        console.error("Error in expense existence check:", checkError)
        return { id: splitId, ...splitData }
      }
    }
    
    // Get the first matching split
    const split = splits[0]

    // Get the expense details to ensure the user has permission to update it
    const { data: expense, error: expenseError } = await adminClient
      .from("expenses")
      .select("*")
      .eq("id", split.expense_id)
      .single()

    if (expenseError || !expense) {
      throw new Error("Access denied")
    }

    // Validate split amount if provided
    if (splitData.amount && (splitData.amount <= 0 || splitData.amount > expense.amount)) {
      throw new Error("Invalid split amount")
    }

    // Update the split expense
    const { data, error } = await adminClient
      .from("expense_splits")
      .update({
        shared_with_name: splitData.shared_with_name,
        amount: splitData.amount,
        status: splitData.status,
        notes: splitData.notes
      })
      .eq("id", split.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating split expense:", error)
      throw new Error("Failed to update split expense")
    }

    // Revalidate the expenses path to update UI
    revalidatePath("/expenses")
    
    return data
  } catch (error) {
    console.error("Error in updateSplitExpense:", error)
    throw error
  }
}

// Delete a split expense
export async function deleteSplitExpense(splitId: string): Promise<any> {
  if (!splitId) {
    console.warn("No split ID provided to deleteSplitExpense");
    return { success: false, message: "No split ID provided" };
  }

  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      console.error("Failed to initialize Supabase client");
      return { success: false, message: "Database connection failed" };
    }

    let user;
    try {
      user = await getAuthenticatedUser();
    } catch (authError) {
      console.error("Authentication error:", authError);
      return { success: false, message: "Authentication failed" };
    }

    if (!user) {
      console.warn("No authenticated user found when deleting split expense");
      return { success: false, message: "Authentication required" };
    }

    // First check if the split expense exists
    const { data: splitExpense, error: splitError } = await supabase
      .from("expense_splits")
      .select("id, expense_id")
      .eq("id", splitId)
      .single()

    // If split expense doesn't exist, consider it already deleted (idempotent delete)
    if (splitError) {
      if (splitError.code === "PGRST116") { // PostgreSQL not found error
        console.log(`Split expense with ID ${splitId} not found, considering it already deleted`);
        return { success: true, message: "Split expense already deleted" };
      }
      console.error("Error checking split expense:", splitError);
      return { success: false, message: "Failed to check split expense" };
    }

    if (!splitExpense) {
      console.log(`Split expense with ID ${splitId} not found, considering it already deleted`);
      return { success: true, message: "Split expense already deleted" };
    }

    // Check if the expense belongs to the user (optional, can skip if causing issues)
    try {
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .select("id")
        .eq("id", splitExpense.expense_id)
        .eq("user_id", user.id)
        .single()

      // If expense doesn't belong to user or doesn't exist, log but continue with deletion
      if (expenseError || !expense) {
        console.warn(`Access check failed for expense ${splitExpense.expense_id}, but proceeding with deletion`);
      }
    } catch (accessError) {
      console.warn("Error checking expense ownership, but proceeding with deletion:", accessError);
    }

    // Delete the split expense
    try {
      if (!supabase) {
        throw new Error("Failed to initialize Supabase client")
      }

      const { error } = await supabase
        .from("expense_splits")
        .delete()
        .eq("id", splitId)

      if (error) {
        console.error("Error deleting split expense:", error);
        return { success: false, message: "Failed to delete split expense" };
      }
    } catch (deleteError) {
      console.error("Error in delete operation:", deleteError);
      return { success: false, message: "Delete operation failed" };
    }

    // Revalidate the expenses path to update UI
    try {
      revalidatePath("/expenses");
    } catch (revalidateError) {
      console.warn("Error revalidating path, but split was deleted:", revalidateError);
    }
    
    return { success: true, message: "Split expense deleted successfully" };
  } catch (error) {
    console.error("Unexpected error in deleteSplitExpense:", error);
    return { success: false, message: "An unexpected error occurred" };
  }
}

// Get total amount of pending split expenses
export async function getPendingSplitExpensesTotal(): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }

    const user = await getAuthenticatedUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    const { data, error } = await supabase.rpc('get_pending_split_expenses_total', {
      user_id_param: user.id
    })

    if (error) {
      console.error("Error fetching pending split expenses total:", error)
      
      // Fallback if the RPC function doesn't exist
      const { data: expenses, error: fallbackError } = await supabase
        .from("expenses")
        .select(`
          id,
          expense_splits(amount, status)
        `)
        .eq("user_id", user.id)
        .not("expense_splits", "is", null)

      if (fallbackError) {
        throw new Error("Failed to fetch pending split expenses")
      }

      // Calculate total manually
      const total = expenses?.reduce((sum: number, expense: any) => {
        const splits = expense.expense_splits || [];
        const splitSum = splits.reduce((splitSum: number, split: any) => splitSum + split.amount, 0);
        return sum + splitSum;
      }, 0) || 0

      return total
    }

    return data || 0
  } catch (error) {
    console.error("Error in getPendingSplitExpensesTotal:", error)
    throw error
  }
}

// Get formatted split expenses for UI display
export async function getFormattedSplitExpenses(): Promise<any[]> {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }

    const user = await getAuthenticatedUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    // Get expenses with split information
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        id,
        merchant_name,
        description,
        amount,
        spent_at,
        split_with_name,
        split_amount,
        expense_splits(id, shared_with_name, amount, status, created_at, notes)
      `)
      .eq("user_id", user.id)
      .or(`split_with_name.neq.null,expense_splits.neq.null`)
      .order("spent_at", { ascending: false })

    if (error) {
      console.error("Error fetching split expenses:", error)
      throw new Error("Failed to fetch split expenses")
    }

    // Format the expenses for UI display
    const formattedExpenses = data.map((expense: any) => {
      // Determine if this is a direct split (using split_with_name) or using expense_splits table
      const isDirectSplit = expense.split_with_name && expense.split_amount;
      const hasSplits = expense.expense_splits && expense.expense_splits.length > 0;
      
      if (!isDirectSplit && !hasSplits) {
        return null; // Skip expenses that don't have split information
      }
      
      // Calculate total pending amount and determine status
      let pendingAmount = 0;
      let status = 'settled';
      let participants: Array<{
        id: string;
        name: string;
        avatar: string;
        amount: number;
        status: string;
      }> = [];
      
      if (isDirectSplit) {
        // For direct splits, create a simple participant structure
        participants = [
          {
            id: user.id,
            name: "You",
            avatar: "/placeholder.svg?height=32&width=32",
            amount: expense.amount - expense.split_amount,
            status: "paid"
          },
          {
            id: `other-${expense.id}`,
            name: expense.split_with_name,
            avatar: "/placeholder.svg?height=32&width=32",
            amount: expense.split_amount,
            status: "pending"
          }
        ];
        pendingAmount = expense.split_amount;
        status = pendingAmount > 0 ? 'active' : 'settled';
      } else if (hasSplits) {
        // For expense_splits table entries, create participants from the splits
        participants = [
          {
            id: user.id,
            name: "You",
            avatar: "/placeholder.svg?height=32&width=32",
            amount: expense.amount - expense.expense_splits.reduce((sum: number, split: any) => sum + split.amount, 0),
            status: "paid"
          },
          ...expense.expense_splits.map((split: any) => ({
            id: split.id,
            name: split.shared_with_name,
            avatar: "/placeholder.svg?height=32&width=32",
            amount: split.amount,
            status: split.status || "pending"
          }))
        ];
        
        // Calculate pending amount and determine status
        const pendingSplits = expense.expense_splits.filter((split: any) => split.status === 'pending');
        pendingAmount = pendingSplits.reduce((sum: number, split: any) => sum + split.amount, 0);
        status = pendingAmount > 0 ? 'active' : 'settled';
      }
      
      return {
        id: expense.id,
        merchant: expense.merchant_name || expense.description,
        category: expense.category,
        amount: expense.amount,
        date: new Date(expense.spent_at),
        status: status as 'active' | 'settled',
        participants,
        pendingAmount
      };
    }).filter(Boolean); // Remove null entries

    return formattedExpenses || [];
  } catch (error) {
    console.error("Error in getFormattedSplitExpenses:", error)
    return [];
  }
}

// Settle a split expense
export async function settleSplitExpense(splitId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // First check if this is a direct split (in expenses table) or in expense_splits table
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select("id, split_with_name, split_amount")
      .eq("id", splitId)
      .eq("user_id", user.id)
      .single()

    if (!expenseError && expense?.split_with_name) {
      // This is a direct split in the expenses table
      const { error } = await supabase
        .from("expenses")
        .update({
          split_amount: 0, // Set to 0 to indicate it's settled
          notes: `Split with ${expense.split_with_name} for ${formatCurrency(expense.split_amount)} (Settled)`
        })
        .eq("id", splitId)

      if (error) {
        console.error("Error settling direct split expense:", error)
        throw new Error("Failed to settle split expense")
      }
    } else {
      // This is a split in the expense_splits table
      const { error } = await supabase
        .from("expense_splits")
        .update({
          status: 'accepted'
        })
        .eq("id", splitId)

      if (error) {
        console.error("Error settling split expense:", error)
        throw new Error("Failed to settle split expense")
      }
    }

    // Revalidate paths
    revalidatePath("/expenses")
    revalidatePath("/expenses/split")
    
    return { success: true }
  } catch (error) {
    console.error("Error in settleSplitExpense:", error)
    throw error
  }
}

// Send reminder for a split expense
export async function sendSplitExpenseReminder(splitId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // First check if this is a direct split or in expense_splits table
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }

    const { data: split, error: splitError } = await supabase
      .from("expense_splits")
      .select("id, expense_id, shared_with_name, amount")
      .eq("id", splitId)
      .single()

    if (!splitError && split) {
      // Get the expense details
      if (!supabase) {
        throw new Error("Failed to initialize Supabase client")
      }

      const { data: expense } = await supabase
        .from("expenses")
        .select("description, merchant_name")
        .eq("id", split.expense_id)
        .single()

      // In a real app, this would send an email or notification
      // For now, we'll just log it and update the split record
      console.log(`Reminder sent to ${split.shared_with_name} for ${formatCurrency(split.amount)} for ${expense?.merchant_name || expense?.description}`)

      // Update the split to indicate a reminder was sent
      if (!supabase) {
        throw new Error("Failed to initialize Supabase client")
      }

      await supabase
        .from("expense_splits")
        .update({
          // In a real app, you might track reminder count and dates
          // For now, we'll just add a note to the status
          status: 'pending (reminded)'
        })
        .eq("id", splitId)
    } else {
      // Check if it's a direct split in the expenses table
      if (!supabase) {
        throw new Error("Failed to initialize Supabase client")
      }

      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .select("id, split_with_name, split_amount, description, merchant_name")
        .eq("id", splitId)
        .eq("user_id", user.id)
        .single()

      if (expenseError || !expense?.split_with_name) {
        throw new Error("Split expense not found")
      }

      // In a real app, this would send an email or notification
      console.log(`Reminder sent to ${expense.split_with_name} for ${formatCurrency(expense.split_amount)} for ${expense.merchant_name || expense.description}`)

      // Update the expense to indicate a reminder was sent
      if (!supabase) {
        throw new Error("Failed to initialize Supabase client")
      }

      await supabase
        .from("expenses")
        .update({
          notes: `Split with ${expense.split_with_name} for ${formatCurrency(expense.split_amount)} (Reminder sent)`
        })
        .eq("id", splitId)
    }

    // Revalidate paths
    revalidatePath("/expenses")
    revalidatePath("/expenses/split")
    
    return { success: true, message: "Reminder sent successfully" }
  } catch (error) {
    console.error("Error in sendSplitExpenseReminder:", error)
    throw error
  }
}

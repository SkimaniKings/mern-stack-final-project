"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth/server"

/**
 * Create a split expense
 */
export async function createSplitExpense(
  expenseId: string,
  sharedWithUserId: string,
  amount: number
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()
    
    if (!user) {
      throw new Error("Authentication required")
    }
    
    // Create the split expense record
    const { data, error } = await supabase
      .from('expense_splits')
      .insert({
        expense_id: expenseId,
        shared_with: sharedWithUserId,
        amount,
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Error creating split expense: ${error.message}`)
    }
    
    return data
  } catch (error: any) {
    console.error("Error in createSplitExpense:", error)
    throw new Error(`Failed to create split expense: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Create a split expense from form data
 * This simplified version stores the split information in the expense notes
 * rather than creating separate records in the database
 */
export async function createSplitExpenseFromForm(data: {
  expenseId?: string;
  splitWithName: string;
  splitAmount: number;
  description: string;
}) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()
    
    if (!user) {
      throw new Error("Authentication required")
    }
    
    // Validate input data
    if (!data.splitWithName || !data.splitAmount || !data.description) {
      throw new Error("Missing required fields for split expense")
    }
    
    // Create split information for the notes
    const splitNote = `Split with ${data.splitWithName} for $${data.splitAmount.toFixed(2)}`;
    
    // Check if we're updating an existing expense or creating a new one
    if (data.expenseId) {
      // First, verify that the expense exists and belongs to the user
      const { data: existingExpense, error: getError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', data.expenseId)
        .eq('user_id', user.id)
        .single();
        
      if (getError) {
        console.error("Error fetching expense for split:", getError);
        throw new Error(`Error fetching expense: ${getError.message}`);
      }
      
      // Update the expense with split information
      const updateData = {
        notes: splitNote,
        split_with_name: data.splitWithName,
        split_amount: data.splitAmount
      };
      
      const { error: updateError } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', data.expenseId);
        
      if (updateError) {
        // Check if the error is related to missing columns
        if (updateError.message && updateError.message.includes("column")) {
          console.error("Column error when updating expense with split info:", updateError);
          
          // Try updating just the notes field as a fallback
          const { error: notesUpdateError } = await supabase
            .from('expenses')
            .update({ notes: splitNote })
            .eq('id', data.expenseId);
            
          if (notesUpdateError) {
            throw new Error(`Error updating expense notes: ${notesUpdateError.message}`);
          }
        } else {
          throw new Error(`Error updating expense with split info: ${updateError.message}`);
        }
      }
      
      return data.expenseId;
    }
    
    // If no expenseId provided, create a new expense record
    const expenseData: any = {
      user_id: user.id,
      amount: data.splitAmount,
      description: `${data.description} (Split)`,
      spent_at: new Date().toISOString(),
      category: 'Split',
      notes: splitNote
    };
    
    // Try to add split-specific fields if they exist in the schema
    expenseData.split_with_name = data.splitWithName;
    expenseData.split_amount = data.splitAmount;
    
    const { data: createdExpense, error: expenseError } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single()
    
    if (expenseError) {
      throw new Error(`Error creating split expense: ${expenseError.message}`)
    }
    
    return createdExpense.id
  } catch (error: any) {
    console.error("Error in createSplitExpenseFromForm:", error)
    throw new Error(`Failed to create split expense: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Get split expenses for a user
 */
export async function getSplitExpensesForUser() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()
    
    if (!user) {
      throw new Error("Authentication required")
    }
    
    // Get expenses that are shared with the current user
    const { data, error } = await supabase
      .from('expense_splits')
      .select(`
        *,
        expense:expenses(
          id,
          amount,
          category,
          description,
          spent_at,
          user_id
        ),
        owner:expenses!inner(
          user:users(
            id,
            name,
            email
          )
        )
      `)
      .eq('shared_with', user.id)
    
    if (error) {
      throw new Error(`Error fetching split expenses: ${error.message}`)
    }
    
    return data
  } catch (error: any) {
    console.error("Error in getSplitExpensesForUser:", error)
    throw new Error(`Failed to get split expenses: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Update a split expense status
 */
export async function updateSplitExpenseStatus(
  splitId: string,
  status: 'accepted' | 'rejected'
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()
    
    if (!user) {
      throw new Error("Authentication required")
    }
    
    // Update the split expense status
    const { data, error } = await supabase
      .from('expense_splits')
      .update({ status })
      .eq('id', splitId)
      .eq('shared_with', user.id)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Error updating split expense status: ${error.message}`)
    }
    
    return data
  } catch (error: any) {
    console.error("Error in updateSplitExpenseStatus:", error)
    throw new Error(`Failed to update split expense status: ${error.message || 'Unknown error'}`)
  }
}

// This function is no longer needed since we're using a text input
// Keeping it as a stub for backward compatibility
export async function getUsersForSplitExpense() {
  return [];
}

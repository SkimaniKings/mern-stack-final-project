"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export interface CategorySplit {
  id: string
  transaction_id: string
  transaction_type: 'expense' | 'income' | 'goal' | 'bill' | 'investment'
  category_id: string
  amount: number
  note?: string
  created_at: string
}

export async function getCategorySplits(transactionId: string, transactionType: 'expense' | 'income' | 'goal' | 'bill' | 'investment') {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return { splits: [] }
    }

    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { splits: [] }
    }

    const { data, error } = await supabase
      .from("transaction_category_splits")
      .select("*, category:category_id(id, name, color, icon)")
      .eq("transaction_id", transactionId)
      .eq("transaction_type", transactionType)

    if (error) {
      console.error("Error fetching category splits:", error)
      return { splits: [] }
    }

    return { splits: data }
  } catch (error) {
    console.error("Error in getCategorySplits:", error)
    return { splits: [] }
  }
}

export async function createCategorySplit(formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    // Extract form data
    const transactionId = formData.get("transaction_id") as string
    const transactionType = formData.get("transaction_type") as 'expense' | 'income' | 'goal' | 'bill' | 'investment'
    const categoryId = formData.get("category_id") as string
    const amount = parseFloat(formData.get("amount") as string)
    const note = (formData.get("note") as string) || null

    // Validate required fields
    if (!transactionId || !transactionType || !categoryId || isNaN(amount) || amount <= 0) {
      throw new Error("All fields are required and amount must be greater than 0")
    }

    // Verify the transaction exists and belongs to the user
    let tableToCheck = '';
    switch (transactionType) {
      case 'expense':
        tableToCheck = 'expenses';
        break;
      case 'income':
        tableToCheck = 'incomes';
        break;
      case 'goal':
        tableToCheck = 'financial_goals';
        break;
      case 'bill':
        tableToCheck = 'bills';
        break;
      case 'investment':
        tableToCheck = 'investments';
        break;
    }

    const { data: transaction, error: transactionError } = await supabase
      .from(tableToCheck)
      .select("user_id")
      .eq("id", transactionId)
      .single()

    if (transactionError) {
      throw new Error(`Transaction not found: ${transactionError.message}`)
    }

    if (!transaction || transaction.user_id !== user.id) {
      throw new Error("Transaction not found or access denied")
    }

    // Create split
    const { data, error } = await supabase
      .from("transaction_category_splits")
      .insert({
        transaction_id: transactionId,
        transaction_type: transactionType,
        category_id: categoryId,
        amount,
        note,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error("Error creating category split:", error)
      throw new Error("Failed to create category split")
    }

    // Revalidate paths
    revalidatePath("/transactions")
    revalidatePath("/categories")
    revalidatePath(`/${transactionType}s`)

    return data[0]
  } catch (error) {
    console.error("Error in createCategorySplit:", error)
    throw error
  }
}

export async function updateCategorySplit(id: string, formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    // Extract form data
    const categoryId = formData.get("category_id") as string
    const amount = parseFloat(formData.get("amount") as string)
    const note = (formData.get("note") as string) || null

    // Validate required fields
    if (!categoryId || isNaN(amount) || amount <= 0) {
      throw new Error("All fields are required and amount must be greater than 0")
    }

    // Get the split to verify it's associated with a transaction that belongs to the user
    const { data: split, error: splitError } = await supabase
      .from("transaction_category_splits")
      .select("transaction_id, transaction_type")
      .eq("id", id)
      .single()

    if (splitError) {
      throw new Error(`Split not found: ${splitError.message}`)
    }

    // Verify the transaction belongs to the user
    let tableToCheck = '';
    switch (split.transaction_type) {
      case 'expense':
        tableToCheck = 'expenses';
        break;
      case 'income':
        tableToCheck = 'incomes';
        break;
      case 'goal':
        tableToCheck = 'financial_goals';
        break;
      case 'bill':
        tableToCheck = 'bills';
        break;
      case 'investment':
        tableToCheck = 'investments';
        break;
    }

    const { data: transaction, error: transactionError } = await supabase
      .from(tableToCheck)
      .select("user_id")
      .eq("id", split.transaction_id)
      .single()

    if (transactionError) {
      throw new Error(`Transaction not found: ${transactionError.message}`)
    }

    if (!transaction || transaction.user_id !== user.id) {
      throw new Error("Transaction not found or access denied")
    }

    // Update split
    const { data, error } = await supabase
      .from("transaction_category_splits")
      .update({
        category_id: categoryId,
        amount,
        note
      })
      .eq("id", id)
      .select()

    if (error) {
      console.error("Error updating category split:", error)
      throw new Error("Failed to update category split")
    }

    // Revalidate paths
    revalidatePath("/transactions")
    revalidatePath("/categories")
    revalidatePath(`/${split.transaction_type}s`)

    return data[0]
  } catch (error) {
    console.error("Error in updateCategorySplit:", error)
    throw error
  }
}

export async function deleteCategorySplit(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    // Get the split to verify it's associated with a transaction that belongs to the user
    const { data: split, error: splitError } = await supabase
      .from("transaction_category_splits")
      .select("transaction_id, transaction_type")
      .eq("id", id)
      .single()

    if (splitError) {
      if (splitError.code === "PGRST116") {
        return { success: true } // Already deleted
      }
      throw new Error(`Split not found: ${splitError.message}`)
    }

    // Verify the transaction belongs to the user
    let tableToCheck = '';
    switch (split.transaction_type) {
      case 'expense':
        tableToCheck = 'expenses';
        break;
      case 'income':
        tableToCheck = 'incomes';
        break;
      case 'goal':
        tableToCheck = 'financial_goals';
        break;
      case 'bill':
        tableToCheck = 'bills';
        break;
      case 'investment':
        tableToCheck = 'investments';
        break;
    }

    const { data: transaction, error: transactionError } = await supabase
      .from(tableToCheck)
      .select("user_id")
      .eq("id", split.transaction_id)
      .single()

    if (transactionError) {
      throw new Error(`Transaction not found: ${transactionError.message}`)
    }

    if (!transaction || transaction.user_id !== user.id) {
      throw new Error("Transaction not found or access denied")
    }

    // Delete split
    const { error } = await supabase
      .from("transaction_category_splits")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting category split:", error)
      throw new Error("Failed to delete category split")
    }

    // Revalidate paths
    revalidatePath("/transactions")
    revalidatePath("/categories")
    revalidatePath(`/${split.transaction_type}s`)

    return { success: true }
  } catch (error) {
    console.error("Error in deleteCategorySplit:", error)
    throw error
  }
}

export async function getCategorySplitTotals(userId: string, categoryId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { total: 0, count: 0 }
    }

    // Use the transaction_category_split_totals view from categories.sql
    const { data, error } = await supabase
      .from("transaction_category_split_totals")
      .select("total_split, transaction_count")
      .eq("user_id", userId)
      .eq("category_id", categoryId)
      .single()

    if (error) {
      console.error("Error fetching category split totals:", error)
      return { total: 0, count: 0 }
    }

    return { 
      total: data.total_split || 0, 
      count: data.transaction_count || 0 
    }
  } catch (error) {
    console.error("Error in getCategorySplitTotals:", error)
    return { total: 0, count: 0 }
  }
}

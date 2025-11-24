"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"

// Interface for receipt data
export interface ReceiptData {
  expense_id: string
  image_url?: string
  text_content?: string
  warranty_expiry?: Date | null
  receipt_date?: Date | null
}

// Get receipt by expense ID
export async function getReceiptByExpenseId(expenseId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // First check if the expense belongs to the user
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", expenseId)
      .eq("user_id", user.id)
      .single()

    if (expenseError || !expense) {
      throw new Error("Expense not found or access denied")
    }

    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("expense_id", expenseId)
      .single()

    if (error && error.code !== "PGRST116") { // PGRST116 is "no rows returned"
      console.error("Error fetching receipt:", error)
      throw new Error("Failed to fetch receipt")
    }

    return data || null
  } catch (error) {
    console.error("Error in getReceiptByExpenseId:", error)
    throw error
  }
}

// Create or update receipt
export async function saveReceipt(receiptData: ReceiptData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // First check if the expense belongs to the user
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", receiptData.expense_id)
      .eq("user_id", user.id)
      .single()

    if (expenseError || !expense) {
      throw new Error("Expense not found or access denied")
    }

    // Check if receipt already exists
    const { data: existingReceipt } = await supabase
      .from("receipts")
      .select("id")
      .eq("expense_id", receiptData.expense_id)
      .single()

    let result
    
    if (existingReceipt) {
      // Update existing receipt
      const { data, error } = await supabase
        .from("receipts")
        .update({
          image_url: receiptData.image_url,
          text_content: receiptData.text_content,
          warranty_expiry: receiptData.warranty_expiry,
          receipt_date: receiptData.receipt_date
        })
        .eq("id", existingReceipt.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating receipt:", error)
        throw new Error("Failed to update receipt")
      }

      result = data
    } else {
      // Create new receipt
      const { data, error } = await supabase
        .from("receipts")
        .insert({
          expense_id: receiptData.expense_id,
          image_url: receiptData.image_url,
          text_content: receiptData.text_content,
          warranty_expiry: receiptData.warranty_expiry,
          receipt_date: receiptData.receipt_date
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating receipt:", error)
        throw new Error("Failed to create receipt")
      }

      result = data
    }

    // Revalidate the expenses path to update UI
    revalidatePath("/expenses")
    
    return result
  } catch (error) {
    console.error("Error in saveReceipt:", error)
    throw error
  }
}

// Delete receipt
export async function deleteReceipt(receiptId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // First check if the receipt belongs to the user's expense
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select("expense_id")
      .eq("id", receiptId)
      .single()

    if (receiptError || !receipt) {
      throw new Error("Receipt not found")
    }

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", receipt.expense_id)
      .eq("user_id", user.id)
      .single()

    if (expenseError || !expense) {
      throw new Error("Access denied")
    }

    // Delete receipt
    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("id", receiptId)

    if (error) {
      console.error("Error deleting receipt:", error)
      throw new Error("Failed to delete receipt")
    }

    // Revalidate the expenses path to update UI
    revalidatePath("/expenses")
    
    return { success: true }
  } catch (error) {
    console.error("Error in deleteReceipt:", error)
    throw error
  }
}

// Process receipt with OCR (placeholder for integration with OCR service)
export async function processReceiptOCR(imageUrl: string) {
  try {
    // This would be integrated with a third-party OCR service
    // For now, we'll return a placeholder
    
    // Mock OCR result
    const mockOcrResult = {
      merchant: "Sample Store",
      date: new Date().toISOString().split('T')[0],
      total: 42.99,
      items: [
        { name: "Item 1", price: 19.99 },
        { name: "Item 2", price: 23.00 }
      ],
      text_content: "Sample Store\nDate: 2023-04-12\nItem 1 $19.99\nItem 2 $23.00\nTotal: $42.99"
    }
    
    return mockOcrResult
  } catch (error) {
    console.error("Error in processReceiptOCR:", error)
    throw new Error("Failed to process receipt with OCR")
  }
}

// Get receipts with warranty information that is still valid
export async function getReceiptsWithValidWarranty() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from("receipts")
      .select(`
        *,
        expenses!inner(id, user_id, merchant_name, amount, category, description, spent_at)
      `)
      .gte("warranty_expiry", today)
      .eq("expenses.user_id", user.id)
      .order("warranty_expiry", { ascending: true })

    if (error) {
      console.error("Error fetching receipts with warranty:", error)
      throw new Error("Failed to fetch receipts with warranty")
    }

    return data
  } catch (error) {
    console.error("Error in getReceiptsWithValidWarranty:", error)
    throw error
  }
}

// Search receipts by text content
export async function searchReceiptsByContent(searchQuery: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }
    
    const { data, error } = await supabase
      .from("receipts")
      .select(`
        *,
        expenses!inner(id, user_id, merchant_name, amount, category, description, spent_at)
      `)
      .ilike("text_content", `%${searchQuery}%`)
      .eq("expenses.user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error searching receipts:", error)
      throw new Error("Failed to search receipts")
    }

    return data
  } catch (error) {
    console.error("Error in searchReceiptsByContent:", error)
    throw error
  }
}

// Add AR overlay to receipt
export async function addAROverlayToReceipt(receiptId: string, metadata: any, highlights: string[]) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // First check if the receipt belongs to the user's expense
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select("expense_id")
      .eq("id", receiptId)
      .single()

    if (receiptError || !receipt) {
      throw new Error("Receipt not found")
    }

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", receipt.expense_id)
      .eq("user_id", user.id)
      .single()

    if (expenseError || !expense) {
      throw new Error("Access denied")
    }

    // Check if AR overlay already exists
    const { data: existingOverlay } = await supabase
      .from("ar_receipt_overlays")
      .select("id")
      .eq("receipt_id", receiptId)
      .single()

    let result
    
    if (existingOverlay) {
      // Update existing overlay
      const { data, error } = await supabase
        .from("ar_receipt_overlays")
        .update({
          metadata,
          highlights
        })
        .eq("id", existingOverlay.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating AR overlay:", error)
        throw new Error("Failed to update AR overlay")
      }

      result = data
    } else {
      // Create new overlay
      const { data, error } = await supabase
        .from("ar_receipt_overlays")
        .insert({
          receipt_id: receiptId,
          metadata,
          highlights
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating AR overlay:", error)
        throw new Error("Failed to create AR overlay")
      }

      result = data
    }

    return result
  } catch (error) {
    console.error("Error in addAROverlayToReceipt:", error)
    throw error
  }
}

"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth"

// Get all receipts
export async function getReceipts() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("receipts")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, account:accounts(id, name))
      `)
      .eq("user_id", user.id)
      .order("date", { ascending: false })

    if (error) {
      console.error("Error fetching receipts:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getReceipts:", error)
    return []
  }
}

// Get receipt by ID
export async function getReceiptById(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from("receipts")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, account:accounts(id, name))
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching receipt:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getReceiptById:", error)
    return null
  }
}

// Create a new receipt
export async function createReceipt(formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Extract form data
    const transactionId = formData.get("transaction_id") as string
    const merchant = formData.get("merchant") as string
    const amount = Number.parseFloat(formData.get("amount") as string)
    const date = formData.get("date") as string
    const imageUrl = formData.get("image_url") as string
    const textContent = formData.get("text_content") as string
    const warrantyInfo = formData.get("warranty_info") as string
    const warrantyExpiry = formData.get("warranty_expiry") as string

    // Validate required fields
    if (!transactionId || !merchant || isNaN(amount) || !date) {
      throw new Error("Transaction ID, merchant, amount, and date are required")
    }

    // Create receipt
    const { data, error } = await supabase
      .from("receipts")
      .insert({
        user_id: user.id,
        transaction_id: transactionId,
        merchant,
        amount,
        date,
        image_url: imageUrl,
        text_content: textContent,
        warranty_info: warrantyInfo,
        warranty_expiry: warrantyExpiry,
      })
      .select()

    if (error) {
      console.error("Error creating receipt:", error)
      throw new Error("Failed to create receipt")
    }

    // Update transaction with receipt ID
    await supabase
      .from("transactions")
      .update({ receipt_id: data[0].id })
      .eq("id", transactionId)

    // Revalidate receipts page
    revalidatePath("/expenses")
    revalidatePath(`/expenses/${transactionId}`)

    return data[0]
  } catch (error) {
    console.error("Error in createReceipt:", error)
    throw error
  }
}

// Update an existing receipt
export async function updateReceipt(id: string, formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Extract form data
    const merchant = formData.get("merchant") as string
    const amount = Number.parseFloat(formData.get("amount") as string)
    const date = formData.get("date") as string
    const imageUrl = formData.get("image_url") as string
    const textContent = formData.get("text_content") as string
    const warrantyInfo = formData.get("warranty_info") as string
    const warrantyExpiry = formData.get("warranty_expiry") as string

    // Validate required fields
    if (!merchant || isNaN(amount) || !date) {
      throw new Error("Merchant, amount, and date are required")
    }

    // Update receipt
    const { data, error } = await supabase
      .from("receipts")
      .update({
        merchant,
        amount,
        date,
        image_url: imageUrl,
        text_content: textContent,
        warranty_info: warrantyInfo,
        warranty_expiry: warrantyExpiry,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()

    if (error) {
      console.error("Error updating receipt:", error)
      throw new Error("Failed to update receipt")
    }

    // Revalidate receipts page
    revalidatePath("/expenses")
    revalidatePath(`/expenses/${data[0].transaction_id}`)

    return data[0]
  } catch (error) {
    console.error("Error in updateReceipt:", error)
    throw error
  }
}

// Delete a receipt
export async function deleteReceipt(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Get receipt details before deletion
    const { data: receipt, error: fetchError } = await supabase
      .from("receipts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !receipt) {
      throw new Error("Receipt not found or access denied")
    }

    // Delete receipt
    const { error } = await supabase.from("receipts").delete().eq("id", id)

    if (error) {
      console.error("Error deleting receipt:", error)
      throw new Error("Failed to delete receipt")
    }

    // Remove receipt ID from transaction
    if (receipt.transaction_id) {
      await supabase
        .from("transactions")
        .update({ receipt_id: null })
        .eq("id", receipt.transaction_id)
    }

    // Revalidate receipts page
    revalidatePath("/expenses")
    if (receipt.transaction_id) {
      revalidatePath(`/expenses/${receipt.transaction_id}`)
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteReceipt:", error)
    throw error
  }
}

// Get receipts with warranty information
export async function getReceiptsWithWarranty() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("receipts")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, account:accounts(id, name))
      `)
      .eq("user_id", user.id)
      .not("warranty_info", "is", null)
      .order("warranty_expiry", { ascending: true })

    if (error) {
      console.error("Error fetching receipts with warranty:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getReceiptsWithWarranty:", error)
    return []
  }
}

// Get receipts by merchant
export async function getReceiptsByMerchant(merchant: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("receipts")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, account:accounts(id, name))
      `)
      .eq("user_id", user.id)
      .ilike("merchant", `%${merchant}%`)
      .order("date", { ascending: false })

    if (error) {
      console.error("Error fetching receipts by merchant:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getReceiptsByMerchant:", error)
    return []
  }
}

// Get receipts by date range
export async function getReceiptsByDateRange(startDate: string, endDate: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("receipts")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, account:accounts(id, name))
      `)
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })

    if (error) {
      console.error("Error fetching receipts by date range:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getReceiptsByDateRange:", error)
    return []
  }
} 
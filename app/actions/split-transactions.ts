"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth"

// Get all split transactions
export async function getSplitTransactions() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("split_transactions")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, account:accounts(id, name)),
        participants:split_participants(id, name, amount, status, payment_date)
      `)
      .eq("user_id", user.id)
      .order("date", { ascending: false })

    if (error) {
      console.error("Error fetching split transactions:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getSplitTransactions:", error)
    return []
  }
}

// Get split transaction by ID
export async function getSplitTransactionById(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from("split_transactions")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, account:accounts(id, name)),
        participants:split_participants(id, name, amount, status, payment_date)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching split transaction:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getSplitTransactionById:", error)
    return null
  }
}

// Create a new split transaction
export async function createSplitTransaction(formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Extract form data
    const description = formData.get("description") as string
    const totalAmount = Number.parseFloat(formData.get("total_amount") as string)
    const date = formData.get("date") as string
    const accountId = formData.get("account_id") as string
    const participants = JSON.parse(formData.get("participants") as string)

    // Validate required fields
    if (!description || isNaN(totalAmount) || !date || !accountId || !participants) {
      throw new Error("Description, total amount, date, account, and participants are required")
    }

    // Validate total amount matches sum of participant amounts
    const participantTotal = participants.reduce((sum: number, p: any) => sum + p.amount, 0)
    if (Math.abs(participantTotal - totalAmount) > 0.01) {
      throw new Error("Total amount must match sum of participant amounts")
    }

    // Create split transaction
    const { data: splitTransaction, error: splitError } = await supabase
      .from("split_transactions")
      .insert({
        user_id: user.id,
        total_amount: totalAmount,
        description,
        date,
        status: "pending",
      })
      .select()

    if (splitError) {
      console.error("Error creating split transaction:", splitError)
      throw new Error("Failed to create split transaction")
    }

    // Create participants
    const participantInserts = participants.map((p: any) => ({
      split_id: splitTransaction[0].id,
      name: p.name,
      amount: p.amount,
      status: "pending",
    }))

    const { error: participantsError } = await supabase
      .from("split_participants")
      .insert(participantInserts)

    if (participantsError) {
      console.error("Error creating participants:", participantsError)
      throw new Error("Failed to create participants")
    }

    // Create main transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        description,
        amount: totalAmount,
        is_income: false,
        account_id: accountId,
        date,
        is_split: true,
        split_id: splitTransaction[0].id,
      })
      .select()

    if (transactionError) {
      console.error("Error creating transaction:", transactionError)
      throw new Error("Failed to create transaction")
    }

    // Update account balance
    const { error: accountError } = await supabase.rpc("update_account_balance", {
      p_account_id: accountId,
      p_amount: -totalAmount,
    })

    if (accountError) {
      console.error("Error updating account balance:", accountError)
    }

    // Revalidate expenses page
    revalidatePath("/expenses")
    revalidatePath(`/expenses/${transaction[0].id}`)

    return {
      splitTransaction: splitTransaction[0],
      transaction: transaction[0],
      participants: participantInserts,
    }
  } catch (error) {
    console.error("Error in createSplitTransaction:", error)
    throw error
  }
}

// Update a split transaction
export async function updateSplitTransaction(id: string, formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Get original split transaction
    const { data: originalSplit, error: fetchError } = await supabase
      .from("split_transactions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !originalSplit) {
      throw new Error("Split transaction not found or access denied")
    }

    // Extract form data
    const description = formData.get("description") as string
    const totalAmount = Number.parseFloat(formData.get("total_amount") as string)
    const date = formData.get("date") as string
    const accountId = formData.get("account_id") as string
    const participants = JSON.parse(formData.get("participants") as string)

    // Validate required fields
    if (!description || isNaN(totalAmount) || !date || !accountId || !participants) {
      throw new Error("Description, total amount, date, account, and participants are required")
    }

    // Validate total amount matches sum of participant amounts
    const participantTotal = participants.reduce((sum: number, p: any) => sum + p.amount, 0)
    if (Math.abs(participantTotal - totalAmount) > 0.01) {
      throw new Error("Total amount must match sum of participant amounts")
    }

    // Update split transaction
    const { data: splitTransaction, error: splitError } = await supabase
      .from("split_transactions")
      .update({
        description,
        total_amount: totalAmount,
        date,
      })
      .eq("id", id)
      .select()

    if (splitError) {
      console.error("Error updating split transaction:", splitError)
      throw new Error("Failed to update split transaction")
    }

    // Delete existing participants
    const { error: deleteError } = await supabase
      .from("split_participants")
      .delete()
      .eq("split_id", id)

    if (deleteError) {
      console.error("Error deleting participants:", deleteError)
      throw new Error("Failed to delete participants")
    }

    // Create new participants
    const participantInserts = participants.map((p: any) => ({
      split_id: id,
      name: p.name,
      amount: p.amount,
      status: p.status || "pending",
    }))

    const { error: participantsError } = await supabase
      .from("split_participants")
      .insert(participantInserts)

    if (participantsError) {
      console.error("Error creating participants:", participantsError)
      throw new Error("Failed to create participants")
    }

    // Get associated transaction
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("split_id", id)
      .single()

    if (transaction) {
      // Calculate balance adjustments
      const originalImpact = -originalSplit.total_amount
      const newImpact = -totalAmount

      // Update transaction
      const { error: transactionError } = await supabase
        .from("transactions")
        .update({
          description,
          amount: totalAmount,
          account_id: accountId,
          date,
        })
        .eq("id", transaction.id)

      if (transactionError) {
        console.error("Error updating transaction:", transactionError)
        throw new Error("Failed to update transaction")
      }

      // Handle account balance updates
      if (transaction.account_id === accountId) {
        // Same account, just update the difference
        const balanceAdjustment = newImpact - originalImpact

        if (balanceAdjustment !== 0) {
          const { error: accountError } = await supabase.rpc("update_account_balance", {
            p_account_id: accountId,
            p_amount: balanceAdjustment,
          })

          if (accountError) {
            console.error("Error updating account balance:", accountError)
          }
        }
      } else {
        // Different account, update both old and new accounts
        // Reverse the effect on the old account
        const { error: oldAccountError } = await supabase.rpc("update_account_balance", {
          p_account_id: transaction.account_id,
          p_amount: -originalImpact,
        })

        if (oldAccountError) {
          console.error("Error updating old account balance:", oldAccountError)
        }

        // Apply the effect to the new account
        const { error: newAccountError } = await supabase.rpc("update_account_balance", {
          p_account_id: accountId,
          p_amount: newImpact,
        })

        if (newAccountError) {
          console.error("Error updating new account balance:", newAccountError)
        }
      }
    }

    // Revalidate expenses page
    revalidatePath("/expenses")
    if (transaction) {
      revalidatePath(`/expenses/${transaction.id}`)
    }

    return {
      splitTransaction: splitTransaction[0],
      participants: participantInserts,
    }
  } catch (error) {
    console.error("Error in updateSplitTransaction:", error)
    throw error
  }
}

// Delete a split transaction
export async function deleteSplitTransaction(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Get split transaction details
    const { data: splitTransaction, error: fetchError } = await supabase
      .from("split_transactions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !splitTransaction) {
      throw new Error("Split transaction not found or access denied")
    }

    // Get associated transaction
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("split_id", id)
      .single()

    // Delete participants
    const { error: participantsError } = await supabase
      .from("split_participants")
      .delete()
      .eq("split_id", id)

    if (participantsError) {
      console.error("Error deleting participants:", participantsError)
      throw new Error("Failed to delete participants")
    }

    // Delete split transaction
    const { error: splitError } = await supabase
      .from("split_transactions")
      .delete()
      .eq("id", id)

    if (splitError) {
      console.error("Error deleting split transaction:", splitError)
      throw new Error("Failed to delete split transaction")
    }

    if (transaction) {
      // Delete transaction
      const { error: transactionError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)

      if (transactionError) {
        console.error("Error deleting transaction:", transactionError)
        throw new Error("Failed to delete transaction")
      }

      // Update account balance (reverse the transaction effect)
      const balanceAdjustment = transaction.amount

      const { error: accountError } = await supabase.rpc("update_account_balance", {
        p_account_id: transaction.account_id,
        p_amount: balanceAdjustment,
      })

      if (accountError) {
        console.error("Error updating account balance:", accountError)
      }
    }

    // Revalidate expenses page
    revalidatePath("/expenses")
    if (transaction) {
      revalidatePath(`/expenses/${transaction.id}`)
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteSplitTransaction:", error)
    throw error
  }
}

// Update participant status
export async function updateParticipantStatus(participantId: string, status: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Get participant details
    const { data: participant, error: fetchError } = await supabase
      .from("split_participants")
      .select(`
        *,
        split:split_transactions(user_id)
      `)
      .eq("id", participantId)
      .single()

    if (fetchError || !participant || participant.split.user_id !== user.id) {
      throw new Error("Participant not found or access denied")
    }

    // Update participant status
    const { data, error } = await supabase
      .from("split_participants")
      .update({
        status,
        payment_date: status === "paid" ? new Date().toISOString().split("T")[0] : null,
      })
      .eq("id", participantId)
      .select()

    if (error) {
      console.error("Error updating participant status:", error)
      throw new Error("Failed to update participant status")
    }

    // Check if all participants are paid
    const { data: participants } = await supabase
      .from("split_participants")
      .select("status")
      .eq("split_id", participant.split_id)

    const allPaid = participants.every((p) => p.status === "paid")

    if (allPaid) {
      // Update split transaction status
      await supabase
        .from("split_transactions")
        .update({ status: "completed" })
        .eq("id", participant.split_id)
    }

    // Revalidate expenses page
    revalidatePath("/expenses")

    return data[0]
  } catch (error) {
    console.error("Error in updateParticipantStatus:", error)
    throw error
  }
}

// Get split transactions by status
export async function getSplitTransactionsByStatus(status: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("split_transactions")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, account:accounts(id, name)),
        participants:split_participants(id, name, amount, status, payment_date)
      `)
      .eq("user_id", user.id)
      .eq("status", status)
      .order("date", { ascending: false })

    if (error) {
      console.error("Error fetching split transactions by status:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getSplitTransactionsByStatus:", error)
    return []
  }
}

// Get split transactions by participant
export async function getSplitTransactionsByParticipant(participantName: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("split_transactions")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, account:accounts(id, name)),
        participants:split_participants!inner(id, name, amount, status, payment_date)
      `)
      .eq("user_id", user.id)
      .eq("participants.name", participantName)
      .order("date", { ascending: false })

    if (error) {
      console.error("Error fetching split transactions by participant:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getSplitTransactionsByParticipant:", error)
    return []
  }
} 
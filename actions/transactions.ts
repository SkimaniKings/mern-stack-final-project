"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath, redirect } from "next/navigation"

const transactionSchema = z.object({
  date: z.date(),
  payee: z.string().min(1),
  category: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  account: z.string().min(1),
  description: z.string().optional(),
})

export async function getTransactions() {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      redirect("/login")
    }

    // Fetch transactions with the correct column name
    // Changed 'date' to 'created_at' which is likely the correct column name
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        accounts(name, type, institution),
        categories(name, icon, color)
      `)
      .order("created_at", { ascending: false }) // Changed from 'date' to 'created_at'
      .limit(100)

    if (error) {
      console.error("Error fetching transactions:", error)
      throw new Error(`Error fetching transactions: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error("Error in getTransactions:", error)
    throw error
  }
}

export async function getTransactionById(id: string) {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      redirect("/login")
    }

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        accounts(name, type, institution),
        categories(name, icon, color)
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching transaction:", error)
      throw new Error(`Error fetching transaction: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error("Error in getTransactionById:", error)
    throw error
  }
}

export async function createTransaction(formData: FormData | z.infer<typeof transactionSchema>) {
  const supabase = createClient()

  let data: z.infer<typeof transactionSchema>

  if (formData instanceof FormData) {
    const rawData = {
      date: new Date(formData.get("date") as string),
      payee: formData.get("payee") as string,
      category: formData.get("category") as string,
      amount: Number.parseFloat(formData.get("amount") as string),
      type: formData.get("type") as "income" | "expense",
      account: formData.get("account") as string,
      description: formData.get("description") as string | undefined,
    }

    data = transactionSchema.parse(rawData)
  } else {
    data = transactionSchema.parse(formData)
  }

  try {
    // Try to insert with date field
    const { error } = await supabase.from("transactions").insert([
      {
        date: data.date.toISOString(),
        payee: data.payee,
        category: data.category,
        amount: data.amount,
        type: data.type,
        account: data.account,
        description: data.description,
      },
    ])

    if (error) {
      // If date field doesn't exist, try with created_at
      if (error.message.includes("date does not exist")) {
        const { error: fallbackError } = await supabase.from("transactions").insert([
          {
            created_at: data.date.toISOString(),
            payee: data.payee,
            category: data.category,
            amount: data.amount,
            type: data.type,
            account: data.account,
            description: data.description,
          },
        ])

        if (fallbackError) {
          console.error("Error creating transaction with fallback:", fallbackError)
          throw new Error("Failed to create transaction")
        }
      } else {
        console.error("Error creating transaction:", error)
        throw new Error("Failed to create transaction")
      }
    }

    revalidatePath("/expenses")
    revalidatePath("/dashboard")
  } catch (error) {
    console.error("Unexpected error in createTransaction:", error)
    throw new Error("Failed to create transaction")
  }
}

export async function updateTransaction(id: string, formData: FormData | Partial<z.infer<typeof transactionSchema>>) {
  const supabase = createClient()

  let data: Partial<z.infer<typeof transactionSchema>>

  if (formData instanceof FormData) {
    const rawData: Record<string, any> = {}

    if (formData.has("date")) rawData.date = new Date(formData.get("date") as string)
    if (formData.has("payee")) rawData.payee = formData.get("payee") as string
    if (formData.has("category")) rawData.category = formData.get("category") as string
    if (formData.has("amount")) rawData.amount = Number.parseFloat(formData.get("amount") as string)
    if (formData.has("type")) rawData.type = formData.get("type") as "income" | "expense"
    if (formData.has("account")) rawData.account = formData.get("account") as string
    if (formData.has("description")) rawData.description = formData.get("description") as string

    data = transactionSchema.partial().parse(rawData)
  } else {
    data = transactionSchema.partial().parse(formData)
  }

  try {
    const updateData: Record<string, any> = { ...data }

    // Handle date field appropriately
    if (data.date) {
      // Try to determine if we should use date or created_at
      const { data: tableInfo, error: tableError } = await supabase.from("transactions").select("*").limit(1)

      if (!tableError && tableInfo && tableInfo[0]) {
        const sampleTransaction = tableInfo[0]
        if ("date" in sampleTransaction) {
          updateData.date = data.date.toISOString()
        } else {
          updateData.created_at = data.date.toISOString()
          delete updateData.date
        }
      } else {
        // Fallback to using created_at
        updateData.created_at = data.date.toISOString()
        delete updateData.date
      }
    }

    const { error } = await supabase.from("transactions").update(updateData).eq("id", id)

    if (error) {
      console.error("Error updating transaction:", error)
      throw new Error("Failed to update transaction")
    }

    revalidatePath("/expenses")
    revalidatePath("/dashboard")
  } catch (error) {
    console.error("Unexpected error in updateTransaction:", error)
    throw new Error("Failed to update transaction")
  }
}

export async function deleteTransaction(id: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase.from("transactions").delete().eq("id", id)

    if (error) {
      console.error("Error deleting transaction:", error)
      throw new Error("Failed to delete transaction")
    }

    revalidatePath("/expenses")
    revalidatePath("/dashboard")
  } catch (error) {
    console.error("Unexpected error in deleteTransaction:", error)
    throw new Error("Failed to delete transaction")
  }
}


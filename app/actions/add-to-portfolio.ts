"use server"

import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function addToPortfolio(formData: FormData) {
  const supabase = createServerSupabaseClient()

  // Get the current user
  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  // Get the investment details
  const investmentId = formData.get("investmentId") as string
  const quantity = Number(formData.get("quantity"))
  const price = Number(formData.get("price"))

  if (!investmentId || !quantity || !price) {
    throw new Error("Missing investment details")
  }

  const { data: investment, error: investmentError } = await supabase
    .from("investments")
    .select("*")
    .eq("id", investmentId)
    .single()

  if (investmentError) {
    console.error("Error fetching investment:", investmentError)
    throw new Error("Failed to fetch investment")
  }

  // Calculate the value and cost basis
  const value = quantity * price
  const costBasis = value

  // Create a new investment in the user's portfolio
  const { error } = await supabase.from("investments").insert({
    user_id: user.id,
    name: investment.name,
    ticker: investment.ticker,
    type: investment.type,
    value: value,
    cost_basis: costBasis,
    price: price,
    allocation: 0, // Will be calculated later
    expense_ratio: investment.expense_ratio,
    dividend_yield: investment.dividend_yield,
    sector_id: investment.sector_id,
    region: investment.region,
    tax_location: "taxable", // Default to taxable
  })

  if (error) {
    console.error("Error adding investment to portfolio:", error)
    throw new Error("Failed to add investment to portfolio")
  }

  // Recalculate allocations for all investments in the portfolio
  await recalculateAllocations(user.id)

  // Revalidate the investments page
  revalidatePath("/investments")

  return { success: true }
}

async function recalculateAllocations(userId: string) {
  const supabase = createServerSupabaseClient()

  // Get all investments for the user
  const { data: investments, error } = await supabase.from("investments").select("id, value").eq("user_id", userId)

  if (error) {
    console.error("Error fetching investments for allocation recalculation:", error)
    throw new Error("Failed to recalculate allocations")
  }

  // Calculate total portfolio value
  const totalValue = investments.reduce((sum, inv) => sum + Number.parseFloat(inv.value), 0)

  // Update each investment's allocation
  for (const investment of investments) {
    const allocation = totalValue > 0 ? (Number.parseFloat(investment.value) / totalValue) * 100 : 0

    const { error: updateError } = await supabase.from("investments").update({ allocation }).eq("id", investment.id)

    if (updateError) {
      console.error(`Error updating allocation for investment ${investment.id}:`, updateError)
    }
  }
}


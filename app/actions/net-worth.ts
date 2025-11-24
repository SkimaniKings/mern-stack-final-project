"use server"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"
import { cookies } from "next/headers"
import type { Database } from "@/lib/supabase/database.types"

// Get the current user ID from the session
async function getCurrentUserId() {
  try {
    // Use the server Supabase client which already has cookie handling
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }
    
    const { data, error } = await supabase.auth.getUser()
    
    if (error || !data.user) {
      throw new Error("Authentication required")
    }
    
    return data.user.id
  } catch (error) {
    console.error("Error getting authenticated user:", error)
    throw new Error("Authentication required")
  }
}

export async function getNetWorth() {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()

    // Get assets
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", userId)

    if (assetsError && assetsError.code !== "PGRST116") {
      console.error("Error fetching assets:", assetsError)
      throw new Error("Failed to fetch assets")
    }

    // Get liabilities
    const { data: liabilities, error: liabilitiesError } = await supabase
      .from("liabilities")
      .select("*")
      .eq("user_id", userId)

    if (liabilitiesError && liabilitiesError.code !== "PGRST116") {
      console.error("Error fetching liabilities:", liabilitiesError)
      throw new Error("Failed to fetch liabilities")
    }

    // Get net worth snapshots
    const { data: snapshots, error: snapshotsError } = await supabase
      .from("net_worth_tracker")
      .select("*")
      .eq("user_id", userId)
      .order("date_recorded", { ascending: true })
      .limit(12)

    if (snapshotsError && snapshotsError.code !== "PGRST116") {
      console.error("Error fetching net worth snapshots:", snapshotsError)
      throw new Error("Failed to fetch net worth snapshots")
    }

    // Calculate totals and breakdowns
    const assetItems = assets || []
    const liabilityItems = liabilities || []
    const snapshotItems = snapshots || []

    const totalAssets = assetItems.reduce((sum, asset) => sum + (asset.value || 0), 0)
    const totalLiabilities = liabilityItems.reduce((sum, liability) => sum + (liability.amount_due || 0), 0)
    const netWorth = totalAssets - totalLiabilities

    // Group assets by type
    const assetBreakdown = assetItems.reduce((acc, asset) => {
      const type = asset.type || "Other Assets"
      const existingType = acc.find((item: { category: string; amount: number }) => item.category === type)
      
      if (existingType) {
        existingType.amount += asset.value || 0
      } else {
        acc.push({ category: type, amount: asset.value || 0 })
      }
      
      return acc
    }, [] as { category: string; amount: number }[])

    // Group liabilities by type
    const liabilityBreakdown = liabilityItems.reduce((acc, liability) => {
      const type = liability.type || "Other Liabilities"
      const existingType = acc.find((item: { category: string; amount: number }) => item.category === type)
      
      if (existingType) {
        existingType.amount += liability.amount || 0
      } else {
        acc.push({ category: type, amount: liability.amount || 0 })
      }
      
      return acc
    }, [] as { category: string; amount: number }[])

    // Format history data from snapshots or generate placeholder if none exists
    let formattedHistory: { date: string; netWorth: number; assets: number; liabilities: number }[] = [];
    
    if (snapshotItems && snapshotItems.length > 0) {
      // Use actual snapshot data if available
      formattedHistory = snapshotItems.map(item => ({
        date: new Date(item.date_recorded).toISOString().substring(0, 7),
        netWorth: item.net_worth || 0,
        assets: item.total_assets || 0,
        liabilities: item.total_liabilities || 0
      }))
    } else {
      // Empty history if no snapshots
      formattedHistory = []
    }
    
    // Add current month with exact values if not already present
    const currentMonth = new Date().toISOString().substring(0, 7);
    const hasCurrentMonth = formattedHistory.some(item => item.date === currentMonth);
    
    if (!hasCurrentMonth && (totalAssets > 0 || totalLiabilities > 0)) {
      formattedHistory.push({
        date: currentMonth,
        netWorth: netWorth,
        assets: totalAssets,
        liabilities: totalLiabilities
      });
      
      // Sort history by date
      formattedHistory.sort((a, b) => a.date.localeCompare(b.date));
      
      // Update the database with current month's snapshot (fire and forget)
      try {
        const snapshotId = uuidv4();
        // Use async/await with try/catch instead of Promise.then().catch()
        (async () => {
          try {
            await supabase.from("net_worth_tracker").insert({
              id: snapshotId,
              user_id: userId,
              date_recorded: new Date().toISOString(),
              total_assets: totalAssets,
              total_liabilities: totalLiabilities,
              net_worth: netWorth,
              created_at: new Date().toISOString(),
            });
            console.log("Updated net worth snapshot for current month");
          } catch (err) {
            console.error("Error updating net worth snapshot:", err);
          }
        })();
      } catch (error) {
        console.error("Error preparing net worth snapshot update:", error);
      }
    }
    
    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      assets: assetItems,
      liabilities: liabilityItems,
      assetBreakdown,
      liabilityBreakdown,
      history: formattedHistory,
      snapshots: snapshotItems
    }
  } catch (error) {
    console.error("Error in getNetWorth:", error)
    
    // Rethrow authentication errors
    if (error instanceof Error && error.message === "Authentication required") {
      throw error
    }
    
    // For other errors, return empty data
    return {
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0,
      assets: [],
      liabilities: [],
      assetBreakdown: [],
      liabilityBreakdown: [],
      history: [],
      snapshots: []
    }
  }
}

export async function addAsset(formData: FormData) {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const value = Number.parseFloat(formData.get("value") as string)
  const description = (formData.get("description") as string) || null
  const acquiredAt = formData.get("acquired_at") ? new Date(formData.get("acquired_at") as string).toISOString() : null

  const assetId = uuidv4()
  
  try {
    const { error } = await supabase.from("assets").insert({
      id: assetId,
      user_id: userId,
      asset_type: type,
      value,
      description,
      acquisition_date: acquiredAt,
      is_liquid: type === 'cash' || type === 'stocks' || type === 'cryptocurrency',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error adding asset:", error)
      throw new Error("Failed to add asset")
    }

    // Update net worth snapshot
    await updateNetWorthSnapshot(userId)

    revalidatePath("/net-worth")
    return { id: assetId }
  } catch (error) {
    console.error("Error in addAsset:", error)
    throw new Error("Failed to add asset")
  }
}

export async function updateAsset(formData: FormData) {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  const assetId = formData.get("id") as string
  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const value = Number.parseFloat(formData.get("value") as string)
  const description = (formData.get("description") as string) || null
  const acquiredAt = formData.get("acquired_at") ? new Date(formData.get("acquired_at") as string).toISOString() : null

  try {
    const { error } = await supabase
      .from("assets")
      .update({
        asset_type: type,
        value,
        description,
        acquisition_date: acquiredAt,
        is_liquid: type === 'cash' || type === 'stocks' || type === 'cryptocurrency',
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId)
      .eq("user_id", userId)

    if (error) {
      console.error("Error updating asset:", error)
      throw new Error("Failed to update asset")
    }

    // Update net worth snapshot
    await updateNetWorthSnapshot(userId)

    revalidatePath("/net-worth")
    return { success: true }
  } catch (error) {
    console.error("Error in updateAsset:", error)
    throw new Error("Failed to update asset")
  }
}

export async function deleteAsset(assetId: string) {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  try {
    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", assetId)
      .eq("user_id", userId)

    if (error) {
      console.error("Error deleting asset:", error)
      throw new Error("Failed to delete asset")
    }

    // Update net worth snapshot
    await updateNetWorthSnapshot(userId)

    revalidatePath("/net-worth")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteAsset:", error)
    throw new Error("Failed to delete asset")
  }
}

export async function addLiability(formData: FormData) {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const amount = Number.parseFloat(formData.get("amount") as string)
  const interestRate = formData.get("interest_rate") ? Number.parseFloat(formData.get("interest_rate") as string) : null
  const dueDate = formData.get("due_date") ? new Date(formData.get("due_date") as string).toISOString() : null
  const description = (formData.get("description") as string) || null

  const liabilityId = uuidv4()
  
  try {
    const { error } = await supabase.from("liabilities").insert({
      id: liabilityId,
      user_id: userId,
      liability_type: type,
      amount_due: amount,
      interest_rate: interestRate,
      due_date: dueDate,
      description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error adding liability:", error)
      throw new Error("Failed to add liability")
    }

    // Update net worth snapshot
    await updateNetWorthSnapshot(userId)

    revalidatePath("/net-worth")
    return { id: liabilityId }
  } catch (error) {
    console.error("Error in addLiability:", error)
    throw new Error("Failed to add liability")
  }
}

export async function updateLiability(formData: FormData) {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  const liabilityId = formData.get("id") as string
  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const amount = Number.parseFloat(formData.get("amount") as string)
  const interestRate = formData.get("interest_rate") ? Number.parseFloat(formData.get("interest_rate") as string) : null
  const dueDate = formData.get("due_date") ? new Date(formData.get("due_date") as string).toISOString() : null
  const description = (formData.get("description") as string) || null

  try {
    const { error } = await supabase
      .from("liabilities")
      .update({
        liability_type: type,
        amount_due: amount,
        interest_rate: interestRate,
        due_date: dueDate,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", liabilityId)
      .eq("user_id", userId)

    if (error) {
      console.error("Error updating liability:", error)
      throw new Error("Failed to update liability")
    }

    // Update net worth snapshot
    await updateNetWorthSnapshot(userId)

    revalidatePath("/net-worth")
    return { success: true }
  } catch (error) {
    console.error("Error in updateLiability:", error)
    throw new Error("Failed to update liability")
  }
}

export async function deleteLiability(liabilityId: string) {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  try {
    const { error } = await supabase
      .from("liabilities")
      .delete()
      .eq("id", liabilityId)
      .eq("user_id", userId)

    if (error) {
      console.error("Error deleting liability:", error)
      throw new Error("Failed to delete liability")
    }

    // Update net worth snapshot
    await updateNetWorthSnapshot(userId)

    revalidatePath("/net-worth")
    return { success: true }
  } catch (error) {
    console.error("Error in deleteLiability:", error)
    throw new Error("Failed to delete liability")
  }
}

// Helper function to update net worth snapshot
async function updateNetWorthSnapshot(userId: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get current assets total
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("value")
      .eq("user_id", userId)

    if (assetsError) {
      console.error("Error fetching assets for snapshot update:", assetsError)
      return
    }

    // Get current liabilities total
    const { data: liabilities, error: liabilitiesError } = await supabase
      .from("liabilities")
      .select("amount_due")
      .eq("user_id", userId)

    if (liabilitiesError) {
      console.error("Error fetching liabilities for snapshot update:", liabilitiesError)
      return
    }

    const totalAssets = (assets || []).reduce((sum, asset) => sum + (asset.value || 0), 0)
    const totalLiabilities = (liabilities || []).reduce((sum, liability) => sum + (liability.amount_due || 0), 0)

    // Current date in YYYY-MM format
    const currentMonth = new Date().toISOString().substring(0, 7)

    // Check if we already have an entry for this month
    const { data, error } = await supabase
      .from("net_worth_tracker")
      .select("*")
      .eq("user_id", userId)
      .gte("date_recorded", `${currentMonth}-01`)
      .lt("date_recorded", `${currentMonth}-31`)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error checking existing net worth snapshot:", error)
      return
    }

    if (data) {
      // Update existing snapshot
      const { error: updateError } = await supabase
        .from("net_worth_tracker")
        .update({
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          net_worth: totalAssets - totalLiabilities
        })
        .eq("id", data.id)

      if (updateError) {
        console.error("Error updating net worth snapshot:", updateError)
      }
    } else {
      // Create new snapshot
      const snapshotId = uuidv4()
      const { error: insertError } = await supabase.from("net_worth_tracker").insert({
        id: snapshotId,
        user_id: userId,
        date_recorded: new Date().toISOString(),
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        net_worth: totalAssets - totalLiabilities,
        created_at: new Date().toISOString()
      })

      if (insertError) {
        console.error("Error inserting net worth snapshot:", insertError)
      }
    }
  } catch (error) {
    console.error("Error in updateNetWorthSnapshot:", error)
  }
}

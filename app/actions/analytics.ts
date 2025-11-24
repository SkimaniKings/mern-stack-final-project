"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth"

// Get merchant intelligence
export async function getMerchantIntelligence() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("merchant_intelligence")
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .eq("user_id", user.id)
      .order("average_spend", { ascending: false })

    if (error) {
      console.error("Error fetching merchant intelligence:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getMerchantIntelligence:", error)
    return []
  }
}

// Get merchant intelligence by ID
export async function getMerchantIntelligenceById(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from("merchant_intelligence")
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching merchant intelligence:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getMerchantIntelligenceById:", error)
    return null
  }
}

// Update merchant intelligence
export async function updateMerchantIntelligence(id: string, formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Extract form data
    const categoryId = formData.get("category_id") as string
    const notes = formData.get("notes") as string

    // Update merchant intelligence
    const { data, error } = await supabase
      .from("merchant_intelligence")
      .update({
        category_id: categoryId || null,
        notes,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()

    if (error) {
      console.error("Error updating merchant intelligence:", error)
      throw new Error("Failed to update merchant intelligence")
    }

    // Revalidate expenses page
    revalidatePath("/expenses")

    return data[0]
  } catch (error) {
    console.error("Error in updateMerchantIntelligence:", error)
    throw error
  }
}

// Get time-of-day analysis
export async function getTimeOfDayAnalysis() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("time_analysis")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, category:categories(id, name))
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching time-of-day analysis:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getTimeOfDayAnalysis:", error)
    return []
  }
}

// Get time-of-day analysis by ID
export async function getTimeOfDayAnalysisById(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from("time_analysis")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, category:categories(id, name))
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching time-of-day analysis:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getTimeOfDayAnalysisById:", error)
    return null
  }
}

// Get time-of-day analysis by time of day
export async function getTimeOfDayAnalysisByTimeOfDay(timeOfDay: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("time_analysis")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, category:categories(id, name))
      `)
      .eq("user_id", user.id)
      .eq("time_of_day", timeOfDay)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching time-of-day analysis by time of day:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getTimeOfDayAnalysisByTimeOfDay:", error)
    return []
  }
}

// Get time-of-day analysis by day of week
export async function getTimeOfDayAnalysisByDayOfWeek(dayOfWeek: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("time_analysis")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, category:categories(id, name))
      `)
      .eq("user_id", user.id)
      .eq("day_of_week", dayOfWeek)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching time-of-day analysis by day of week:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getTimeOfDayAnalysisByDayOfWeek:", error)
    return []
  }
}

// Get impulse purchases
export async function getImpulsePurchases() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("time_analysis")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, category:categories(id, name))
      `)
      .eq("user_id", user.id)
      .eq("is_impulse", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching impulse purchases:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getImpulsePurchases:", error)
    return []
  }
}

// Get merchant spending trends
export async function getMerchantSpendingTrends() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("merchant_intelligence")
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .eq("user_id", user.id)
      .order("average_spend", { ascending: false })

    if (error) {
      console.error("Error fetching merchant spending trends:", error)
      return []
    }

    // Calculate spending trends
    const trends = data.map((merchant) => {
      const visitFrequency = merchant.visit_count / 30 // Average visits per month
      const monthlySpend = merchant.average_spend * visitFrequency

      return {
        ...merchant,
        visit_frequency: visitFrequency,
        monthly_spend: monthlySpend,
      }
    })

    return trends
  } catch (error) {
    console.error("Unexpected error in getMerchantSpendingTrends:", error)
    return []
  }
}

// Get spending patterns by time of day
export async function getSpendingPatternsByTimeOfDay() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("time_analysis")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, category:categories(id, name))
      `)
      .eq("user_id", user.id)
      .order("time_of_day", { ascending: true })

    if (error) {
      console.error("Error fetching spending patterns by time of day:", error)
      return []
    }

    // Group by time of day
    const patterns = data.reduce((acc: any, curr) => {
      const timeOfDay = curr.time_of_day
      if (!acc[timeOfDay]) {
        acc[timeOfDay] = {
          time_of_day: timeOfDay,
          total_spend: 0,
          transaction_count: 0,
          average_spend: 0,
          impulse_count: 0,
          impulse_percentage: 0,
        }
      }

      acc[timeOfDay].total_spend += curr.transaction.amount
      acc[timeOfDay].transaction_count += 1
      acc[timeOfDay].average_spend =
        acc[timeOfDay].total_spend / acc[timeOfDay].transaction_count

      if (curr.is_impulse) {
        acc[timeOfDay].impulse_count += 1
        acc[timeOfDay].impulse_percentage =
          (acc[timeOfDay].impulse_count / acc[timeOfDay].transaction_count) * 100
      }

      return acc
    }, {})

    return Object.values(patterns)
  } catch (error) {
    console.error("Unexpected error in getSpendingPatternsByTimeOfDay:", error)
    return []
  }
}

// Get spending patterns by day of week
export async function getSpendingPatternsByDayOfWeek() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("time_analysis")
      .select(`
        *,
        transaction:transactions(id, description, amount, date, category:categories(id, name))
      `)
      .eq("user_id", user.id)
      .order("day_of_week", { ascending: true })

    if (error) {
      console.error("Error fetching spending patterns by day of week:", error)
      return []
    }

    // Group by day of week
    const patterns = data.reduce((acc: any, curr) => {
      const dayOfWeek = curr.day_of_week
      if (!acc[dayOfWeek]) {
        acc[dayOfWeek] = {
          day_of_week: dayOfWeek,
          total_spend: 0,
          transaction_count: 0,
          average_spend: 0,
          impulse_count: 0,
          impulse_percentage: 0,
        }
      }

      acc[dayOfWeek].total_spend += curr.transaction.amount
      acc[dayOfWeek].transaction_count += 1
      acc[dayOfWeek].average_spend =
        acc[dayOfWeek].total_spend / acc[dayOfWeek].transaction_count

      if (curr.is_impulse) {
        acc[dayOfWeek].impulse_count += 1
        acc[dayOfWeek].impulse_percentage =
          (acc[dayOfWeek].impulse_count / acc[dayOfWeek].transaction_count) * 100
      }

      return acc
    }, {})

    return Object.values(patterns)
  } catch (error) {
    console.error("Unexpected error in getSpendingPatternsByDayOfWeek:", error)
    return []
  }
}

// Get recurring transaction patterns
export async function getRecurringTransactionPatterns() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("recurring_patterns")
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .eq("user_id", user.id)
      .order("confidence", { ascending: false })

    if (error) {
      console.error("Error fetching recurring transaction patterns:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getRecurringTransactionPatterns:", error)
    return []
  }
}

// Get recurring transaction pattern by ID
export async function getRecurringTransactionPatternById(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from("recurring_patterns")
      .select(`
        *,
        category:categories(id, name, color, icon)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Error fetching recurring transaction pattern:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Unexpected error in getRecurringTransactionPatternById:", error)
    return null
  }
}

// Update recurring transaction pattern
export async function updateRecurringTransactionPattern(id: string, formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // Extract form data
    const categoryId = formData.get("category_id") as string
    const isSubscription = formData.get("is_subscription") === "true"
    const notes = formData.get("notes") as string

    // Update recurring transaction pattern
    const { data, error } = await supabase
      .from("recurring_patterns")
      .update({
        category_id: categoryId || null,
        is_subscription: isSubscription,
        notes,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()

    if (error) {
      console.error("Error updating recurring transaction pattern:", error)
      throw new Error("Failed to update recurring transaction pattern")
    }

    // Revalidate expenses page
    revalidatePath("/expenses")

    return data[0]
  } catch (error) {
    console.error("Error in updateRecurringTransactionPattern:", error)
    throw error
  }
} 
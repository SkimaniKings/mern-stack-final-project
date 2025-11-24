"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/lib/supabase/database.types"
import type { CurrencyRate } from "@/types/income"

// Get the current user ID from the session
async function getCurrentUserId() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      async get(name) {
        const cookie = await cookieStore.get(name)
        return cookie?.value
      },
      async set(name, value, options) {
        try {
          await cookieStore.set({ name, value, ...options })
        } catch (error) {
          console.error('Error setting cookie:', error)
        }
      },
      async remove(name, options) {
        try {
          await cookieStore.set({ name, value: "", ...options })
        } catch (error) {
          console.error('Error removing cookie:', error)
        }
      },
    },
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // For demo purposes, use a fixed ID if no session
  return session?.user?.id || "123e4567-e89b-12d3-a456-426614174000"
}

// Get all currency rates
export async function getCurrencyRates(): Promise<CurrencyRate[]> {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.from("currency_rates").select("*").eq("user_id", userId).order("as_of_date", { ascending: false })

  if (error) {
    console.error("Error fetching currency rates:", error)
    throw new Error("Failed to fetch currency rates")
  }

  return data || []
}

// Get latest currency rates
export async function getLatestCurrencyRates(): Promise<CurrencyRate[]> {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  // Try to get the latest rates without relying on specific columns
  try {
    const { data, error } = await supabase
      .from("currency_rates")
      .select("*")
      .limit(50)

    if (error) {
      console.error("Error fetching currency rates:", error)
      // If we can't query the table, fetch directly from the API
      try {
        const response = await fetch('https://api.currencyapi.com/v3/latest', {
          headers: {
            'apikey': 'cur_live_fqjJujUdGykB0zyk5Vf3Coab5y8e9tcT5R2fqMMc'
          }
        })

        if (!response.ok) {
          // Fallback to CurrencyFreaks API
          const fallbackResponse = await fetch(
            'https://api.currencyfreaks.com/v2.0/rates/latest?apikey=c1498f49a89b456f820034d057f77ee5'
          )

          if (!fallbackResponse.ok) {
            throw new Error('Both currency APIs failed')
          }

          const fallbackData = await fallbackResponse.json()
          // Convert to our CurrencyRate format
          return Object.entries(fallbackData.rates).map(([currency, rate]) => ({
            id: uuidv4(),
            user_id: userId,
            base_currency: 'USD',
            target_currency: currency,
            rate: Number(rate),
            as_of_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        }

        const apiData = await response.json()
        // Convert to our CurrencyRate format
        return Object.entries(apiData.data).map(([currency, value]: [string, any]) => ({
          id: uuidv4(),
          user_id: userId,
          base_currency: apiData.meta.base_currency,
          target_currency: currency,
          rate: value.value,
          as_of_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      } catch (apiError) {
        console.error("Error fetching from currency APIs:", apiError)
        return []
      }
    }

    return data || []
  } catch (error) {
    console.error("Error fetching latest currency rates:", error)
    return []
  }
}

// Update currency rates from CurrencyAPI
export async function updateCurrencyRates(formData: FormData): Promise<{ id: string }> {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  try {
    // Fetch latest rates from CurrencyAPI
    const response = await fetch('https://api.currencyapi.com/v3/latest', {
      headers: {
        'apikey': 'cur_live_fqjJujUdGykB0zyk5Vf3Coab5y8e9tcT5R2fqMMc'
      }
    })

    if (!response.ok) {
      // Fallback to CurrencyFreaks API if CurrencyAPI fails
      const fallbackResponse = await fetch(
        'https://api.currencyfreaks.com/v2.0/rates/latest?apikey=c1498f49a89b456f820034d057f77ee5'
      )

      if (!fallbackResponse.ok) {
        throw new Error('Both currency APIs failed')
      }

      const fallbackData = await fallbackResponse.json()
      const rates = fallbackData.rates
      const baseDate = new Date().toISOString().split('T')[0]

      // Convert CurrencyFreaks format to our database format
      const rateEntries = Object.entries(rates).map(([currency, rate]) => ({
        id: uuidv4(),
        user_id: userId,
        base_currency: 'USD',
        target_currency: currency,
        rate: Number(rate),
        as_of_date: baseDate
      }))

      const { error } = await supabase.from("currency_rates").insert(rateEntries)

      if (error) {
        throw error
      }

      revalidatePath("/settings")
      return { id: rateEntries[0].id }
    }

    const data = await response.json()
    const baseDate = new Date().toISOString().split('T')[0]

    // Convert CurrencyAPI format to our database format
    const rateEntries = Object.entries(data.data).map(([currency, value]: [string, any]) => ({
      id: uuidv4(),
      user_id: userId,
      base_currency: data.meta.base_currency,
      target_currency: currency,
      rate: value.value,
      as_of_date: baseDate
    }))

    const { error } = await supabase.from("currency_rates").insert(rateEntries)

    if (error) {
      throw error
    }

    revalidatePath("/settings")
    return { id: rateEntries[0].id }
  } catch (error) {
    console.error("Error updating currency rates:", error)
    throw new Error("Failed to update currency rates")
  }
}

// Add a custom currency rate
export async function addCustomCurrencyRate(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()

    const baseCurrency = formData.get("base_currency") as string
    const targetCurrency = formData.get("target_currency") as string
    const rate = Number.parseFloat(formData.get("rate") as string)
    const date = (formData.get("date") as string) || new Date().toISOString().split("T")[0]

    if (!baseCurrency || !targetCurrency || isNaN(rate) || rate <= 0) {
      return {
        success: false,
        message: "Invalid currency rate data",
      }
    }

    // Insert the new rate
    const { error } = await supabase.from("currency_rates").insert({
      user_id: userId,
      base_currency: baseCurrency,
      target_currency: targetCurrency,
      rate,
      as_of_date: date,
    })

    if (error) {
      throw error
    }

    // Also insert the inverse rate
    await supabase.from("currency_rates").insert({
      user_id: userId,
      base_currency: targetCurrency,
      target_currency: baseCurrency,
      rate: 1 / rate,
      as_of_date: date,
    })

    revalidatePath("/income")
    revalidatePath("/currency-converter")

    return {
      success: true,
      message: `Currency rate added successfully: 1 ${baseCurrency} = ${rate} ${targetCurrency}`,
    }
  } catch (error) {
    console.error("Error adding currency rate:", error)
    return {
      success: false,
      message: "Failed to add currency rate",
    }
  }
}

// Convert amount between currencies
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<{ amount: number; rate: number | null }> {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()

    const rates = await getLatestCurrencyRates()

    // If currencies are the same, no conversion needed
    if (fromCurrency === toCurrency) {
      return { amount, rate: 1 }
    }

    // Find direct conversion rate
    const directRate = rates.find((rate) => rate.base_currency === fromCurrency && rate.target_currency === toCurrency)

    if (directRate) {
      return {
        amount: amount * directRate.rate,
        rate: directRate.rate,
      }
    }

    // Try reverse rate
    const reverseRate = rates.find((rate) => rate.base_currency === toCurrency && rate.target_currency === fromCurrency)

    if (reverseRate) {
      return {
        amount: amount / reverseRate.rate,
        rate: 1 / reverseRate.rate,
      }
    }

    // Try conversion through USD as a bridge
    const fromToUSD = rates.find((rate) => rate.base_currency === fromCurrency && rate.target_currency === "USD")

    const usdToTarget = rates.find((rate) => rate.base_currency === "USD" && rate.target_currency === toCurrency)

    if (fromToUSD && usdToTarget) {
      const amountInUSD = amount * fromToUSD.rate
      const finalAmount = amountInUSD * usdToTarget.rate
      const effectiveRate = fromToUSD.rate * usdToTarget.rate

      return {
        amount: finalAmount,
        rate: effectiveRate,
      }
    }

    // If no conversion path found, return original amount
    return { amount, rate: null }
  } catch (error) {
    console.error("Error converting amount:", error)
    return { amount, rate: null }
  }
}

export async function getSupportedCurrencies() {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("supported_currencies")
    .select("*")
    .eq("user_id", userId)
    .order("code", { ascending: true })

  if (error) {
    console.error("Error fetching supported currencies:", error)
    throw new Error("Failed to fetch supported currencies")
  }

  return data || []
}

export async function addSupportedCurrency(formData: FormData) {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  const code = formData.get("code") as string
  const name = formData.get("name") as string
  const symbol = formData.get("symbol") as string
  const isDefault = formData.get("is_default") === "true"

  // If this is set as default, unset any other default currencies
  if (isDefault) {
    const { error: updateError } = await supabase
      .from("supported_currencies")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true)

    if (updateError) {
      console.error("Error updating default currency:", updateError)
      throw new Error("Failed to update default currency")
    }
  }

  const currencyId = uuidv4()
  const { error } = await supabase.from("supported_currencies").insert({
    id: currencyId,
    user_id: userId,
    code,
    name,
    symbol,
    is_default: isDefault,
  })

  if (error) {
    console.error("Error adding supported currency:", error)
    throw new Error("Failed to add supported currency")
  }

  revalidatePath("/settings")
  return { id: currencyId }
}

export async function removeSupportedCurrency(id: string) {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from("supported_currencies").delete().eq("id", id).eq("user_id", userId)

  if (error) {
    console.error("Error removing supported currency:", error)
    throw new Error("Failed to remove supported currency")
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function setDefaultCurrency(id: string) {
  const userId = await getCurrentUserId()
  const supabase = await createServerSupabaseClient()

  // First, unset any existing default currency
  const { error: updateError } = await supabase
    .from("supported_currencies")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true)

  if (updateError) {
    console.error("Error updating default currency:", updateError)
    throw new Error("Failed to update default currency")
  }

  // Then, set the new default currency
  const { error } = await supabase
    .from("supported_currencies")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    console.error("Error setting default currency:", error)
    throw new Error("Failed to set default currency")
  }

  revalidatePath("/settings")
  return { success: true }
}

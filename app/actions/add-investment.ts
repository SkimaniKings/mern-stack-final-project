"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@supabase/ssr"

// Helper function to get the current user
async function getCurrentUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const cookieStore = await cookies()
  
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options)
      },
      remove(name: string, options: any) {
        cookieStore.set(name, '', { ...options, maxAge: 0 })
      },
    },
  })
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user || null
}

// Add or update investment
export async function addInvestment(formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    // Extract data from form
    const name = formData.get("name") as string
    const ticker = formData.get("ticker") as string
    const type = formData.get("type") as string
    const value = parseFloat(formData.get("value") as string)
    const costBasis = parseFloat(formData.get("cost_basis") as string)
    const accountName = formData.get("account_name") as string
    const category = formData.get("category") as string
    const currency = formData.get("currency") as string
    const quantity = formData.get("quantity") ? parseFloat(formData.get("quantity") as string) : null
    const initialPrice = formData.get("initial_price") ? parseFloat(formData.get("initial_price") as string) : null
    const currentPrice = formData.get("current_price") ? parseFloat(formData.get("current_price") as string) : null
    const id = formData.get("id") as string || undefined // For edit mode

    // Validate required fields
    if (!name || !type || isNaN(value) || isNaN(costBasis)) {
      return { error: "Missing required fields. Please provide name, type, value, and cost basis." }
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const cookieStore = await cookies()
    
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    })

    // Find or create account
    let accountId = null
    if (accountName) {
      // Check if account exists
      const { data: existingAccount } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", accountName)
        .single()

      if (existingAccount) {
        accountId = existingAccount.id
      } else {
        // Create new account
        const { data: newAccount, error: accountError } = await supabase
          .from("accounts")
          .insert({
            user_id: user.id,
            name: accountName,
            type: "investment",
            balance: 0,
            currency: currency || "USD",
          })
          .select()

        if (accountError) {
          console.error("Error creating account:", accountError)
        } else if (newAccount && newAccount.length > 0) {
          accountId = newAccount[0].id
        }
      }
    }

    // Find or create category
    let categoryId = null
    if (category) {
      // Check if category exists
      const { data: existingCategory } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", category)
        .single()

      if (existingCategory) {
        categoryId = existingCategory.id
      } else {
        // Create new category
        const { data: newCategory, error: categoryError } = await supabase
          .from("categories")
          .insert({
            user_id: user.id,
            name: category,
            type: "investment",
            color: "#" + Math.floor(Math.random() * 16777215).toString(16), // Random color
          })
          .select()

        if (categoryError) {
          console.error("Error creating category:", categoryError)
        } else if (newCategory && newCategory.length > 0) {
          categoryId = newCategory[0].id
        }
      }
    }

    // Prepare investment data with proper typing
    interface InvestmentData {
      user_id: string;
      name: string;
      ticker: string | null;
      type: string;
      value: number;
      cost_basis: number;
      account_id: string | null;
      category_id: string | null;
      currency: string;
      quantity?: number;
      initial_price?: number;
      current_price?: number;
      updated_at?: string;
      [key: string]: any; // Allow dynamic properties for flexibility
    }
    
    const investmentData: InvestmentData = {
      user_id: user.id,
      name,
      ticker: ticker || null,
      type,
      value,
      cost_basis: costBasis,
      account_id: accountId,
      category_id: categoryId,
      currency: currency || "USD",
    }
    
    // Add the new fields only if they have values to avoid database errors
    if (quantity !== null && !isNaN(quantity)) {
      investmentData.quantity = quantity;
    }
    
    if (initialPrice !== null && !isNaN(initialPrice)) {
      investmentData.initial_price = initialPrice;
    }
    
    if (currentPrice !== null && !isNaN(currentPrice)) {
      investmentData.current_price = currentPrice;
    }
    
    // Add updated_at field if it exists in the database
    try {
      investmentData.updated_at = new Date().toISOString();
    } catch (e) {
      // If updated_at column doesn't exist, just continue
      console.log("updated_at column might not exist yet:", e);
    }

    let result;
    
    if (id) {
      // Update existing investment
      const { data, error } = await supabase
        .from("investments")
        .update(investmentData)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
      
      if (error) {
        console.error("Error updating investment:", error)
        // If the error is related to missing columns, provide a more helpful message
        if (error.message && error.message.includes("column")) {
          return { 
            error: `Database schema needs to be updated. Please run the migration script in db/migrations/add_investment_columns.sql. 
                   Original error: ${error.message}` 
          }
        }
        return { error: `Failed to update investment: ${error.message}` }
      }
      
      result = data
    } else {
      // Create new investment
      const { data, error } = await supabase
        .from("investments")
        .insert(investmentData)
        .select()
      
      if (error) {
        console.error("Error creating investment:", error)
        // If the error is related to missing columns, provide a more helpful message
        if (error.message && error.message.includes("column")) {
          return { 
            error: `Database schema needs to be updated. Please run the migration script in db/migrations/add_investment_columns.sql. 
                   Original error: ${error.message}` 
          }
        }
        return { error: `Failed to create investment: ${error.message}` }
      }
      
      result = data
    }

    // Revalidate the investments and portfolio pages to show the new/updated investment
    revalidatePath("/investments")
    revalidatePath("/investments/portfolio")
    
    return { success: true, data: result }
  } catch (error) {
    console.error("Server error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Delete investment
export async function deleteInvestment(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect("/login")
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const cookieStore = await cookies()
    
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    })

    // Delete the investment
    const { error } = await supabase
      .from("investments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
    
    if (error) {
      console.error("Error deleting investment:", error)
      return { error: `Failed to delete investment: ${error.message}` }
    }

    // Revalidate the investments and portfolio pages
    revalidatePath("/investments")
    revalidatePath("/investments/portfolio")
    
    return { success: true }
  } catch (error) {
    console.error("Server error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

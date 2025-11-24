"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"

export async function getBillCategories() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { categories: [] }
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }

    // Fetch bill categories from the bill_categories table
    const { data: categories, error } = await supabase
      .from("bill_categories")
      .select("*")
      .order("name")

    if (error) {
      console.error("Error fetching bill categories:", error)
      throw new Error("Failed to fetch bill categories")
    }

    return { categories: categories || [] }
  } catch (error) {
    console.error("Error in getBillCategories:", error)
    return { categories: [] }
  }
}

export async function createBillCategory(formData: FormData) {
  return {
    error: {
      message: "Users are not allowed to create new categories."
    }
  }
}

// DANGEROUS: This will delete all user-created categories and reset to a default list.
export async function resetBillCategories() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error("Authentication required")
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client")
    }

    // First, delete all existing categories to ensure a clean slate.
    const { error: deleteError } = await supabase
      .from("bill_categories")
      .delete()
      .neq("id", "0") // Placeholder to delete all, adjust if needed

    if (deleteError) {
      console.error("Error deleting bill categories:", deleteError)
      throw new Error("Failed to delete bill categories")
    }

    // Next, insert the list of default categories.
    const defaultCategories = [
      { name: "Rent", description: "Monthly rent payment", icon: "home" },
      { name: "Mortgage", description: "Monthly mortgage payment", icon: "home-loan" },
      { name: "Utilities", description: "Electricity, water, gas, etc.", icon: "lightbulb" },
      { name: "Internet", description: "Monthly internet bill", icon: "wifi" },
      { name: "Phone", description: "Mobile or landline phone bill", icon: "phone" },
      { name: "Insurance", description: "Health, auto, or home insurance", icon: "shield" },
      { name: "Loan Payment", description: "Car loan, personal loan, etc.", icon: "car" },
      { name: "Credit Card", description: "Monthly credit card payment", icon: "credit-card" },
      { name: "Groceries", description: "Regular grocery shopping", icon: "shopping-cart" },
      { name: "Dining Out", description: "Restaurants, cafes, and take-out", icon: "utensils" },
      { name: "Transportation", description: "Gas, public transit, ride-sharing", icon: "bus" },
      { name: "Entertainment", description: "Movies, concerts, subscriptions", icon: "ticket" },
      { name: "Healthcare", description: "Doctor visits, prescriptions", icon: "medical" },
      { name: "Education", description: "Tuition, books, supplies", icon: "book" },
      { name: "Childcare", description: "Daycare, babysitting services", icon: "child" },
      { name: "Other", description: "Miscellaneous expenses", icon: "ellipsis-h" },
    ]

    const { data: categories, error: insertError } = await supabase
      .from("bill_categories")
      .insert(defaultCategories)
      .select()

    if (insertError) {
      console.error("Error creating default bill categories:", insertError)
      throw new Error("Failed to create default bill categories")
    }

    return { success: true, categories }
  } catch (error) {
    console.error("Error in resetBillCategories:", error)
    return { success: false, error: (error as Error).message }
  }

  
}

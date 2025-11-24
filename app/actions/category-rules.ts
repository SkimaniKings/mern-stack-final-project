"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export interface CategoryRule {
  id: string
  user_id: string
  name: string
  match_field: 'merchant' | 'note' | 'tag' | 'location' | 'goal_name' | 'bill_name' | 'investment_type'
  match_operator: 'equals' | 'contains' | 'starts_with' | 'ends_with'
  match_value: string
  category_id: string
  applies_to: string[]
  priority: number
  is_active: boolean
  created_at: string
}

export async function getCategoryRules() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      return { rules: [] }
    }

    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { rules: [] }
    }

    const { data, error } = await supabase
      .from("category_rules")
      .select("*, category:category_id(id, name)")
      .eq("user_id", user.id)
      .order("priority", { ascending: false })

    if (error) {
      console.error("Error fetching category rules:", error)
      return { rules: [] }
    }

    return { rules: data }
  } catch (error) {
    console.error("Error in getCategoryRules:", error)
    return { rules: [] }
  }
}

export async function createCategoryRule(formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    // Extract form data
    const name = formData.get("name") as string
    const matchField = formData.get("match_field") as 'merchant' | 'note' | 'tag' | 'location' | 'goal_name' | 'bill_name' | 'investment_type'
    const matchOperator = formData.get("match_operator") as 'equals' | 'contains' | 'starts_with' | 'ends_with'
    const matchValue = formData.get("match_value") as string
    const categoryId = formData.get("category_id") as string
    const appliesTo = formData.getAll("applies_to") as string[]
    const priority = parseInt(formData.get("priority") as string) || 1
    const isActive = formData.get("is_active") === "true"

    // Validate required fields
    if (!name || !matchField || !matchOperator || !matchValue || !categoryId || appliesTo.length === 0) {
      throw new Error("All fields are required")
    }

    // Create rule
    const { data, error } = await supabase
      .from("category_rules")
      .insert({
        user_id: user.id,
        name,
        match_field: matchField,
        match_operator: matchOperator,
        match_value: matchValue,
        category_id: categoryId,
        applies_to: appliesTo,
        priority,
        is_active: isActive,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error("Error creating category rule:", error)
      throw new Error("Failed to create category rule")
    }

    // Revalidate paths
    revalidatePath("/categories")
    revalidatePath("/transactions")

    return data[0]
  } catch (error) {
    console.error("Error in createCategoryRule:", error)
    throw error
  }
}

export async function updateCategoryRule(id: string, formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    // Verify rule belongs to user
    const { data: rule, error: ruleError } = await supabase
      .from("category_rules")
      .select("user_id")
      .eq("id", id)
      .single()

    if (ruleError) {
      if (ruleError.code === "PGRST116") {
        throw new Error("Rule not found")
      }
      throw new Error(`Database error: ${ruleError.message}`)
    }

    if (!rule || rule.user_id !== user.id) {
      throw new Error("Rule not found or access denied")
    }

    // Extract form data
    const name = formData.get("name") as string
    const matchField = formData.get("match_field") as 'merchant' | 'note' | 'tag' | 'location' | 'goal_name' | 'bill_name' | 'investment_type'
    const matchOperator = formData.get("match_operator") as 'equals' | 'contains' | 'starts_with' | 'ends_with'
    const matchValue = formData.get("match_value") as string
    const categoryId = formData.get("category_id") as string
    const appliesTo = formData.getAll("applies_to") as string[]
    const priority = parseInt(formData.get("priority") as string) || 1
    const isActive = formData.get("is_active") === "true"

    // Validate required fields
    if (!name || !matchField || !matchOperator || !matchValue || !categoryId || appliesTo.length === 0) {
      throw new Error("All fields are required")
    }

    // Update rule
    const { data, error } = await supabase
      .from("category_rules")
      .update({
        name,
        match_field: matchField,
        match_operator: matchOperator,
        match_value: matchValue,
        category_id: categoryId,
        applies_to: appliesTo,
        priority,
        is_active: isActive
      })
      .eq("id", id)
      .select()

    if (error) {
      console.error("Error updating category rule:", error)
      throw new Error("Failed to update category rule")
    }

    // Revalidate paths
    revalidatePath("/categories")
    revalidatePath("/transactions")

    return data[0]
  } catch (error) {
    console.error("Error in updateCategoryRule:", error)
    throw error
  }
}

export async function deleteCategoryRule(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    // Verify rule belongs to user
    const { data: rule, error: ruleError } = await supabase
      .from("category_rules")
      .select("user_id")
      .eq("id", id)
      .single()

    if (ruleError) {
      if (ruleError.code === "PGRST116") {
        return { success: true } // Already deleted
      }
      throw new Error(`Database error: ${ruleError.message}`)
    }

    if (!rule || rule.user_id !== user.id) {
      throw new Error("Rule not found or access denied")
    }

    // Delete rule
    const { error } = await supabase
      .from("category_rules")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting category rule:", error)
      throw new Error("Failed to delete category rule")
    }

    // Revalidate paths
    revalidatePath("/categories")
    revalidatePath("/transactions")

    return { success: true }
  } catch (error) {
    console.error("Error in deleteCategoryRule:", error)
    throw error
  }
}

// Function to apply category rules to a transaction
export async function applyCategoryRules(
  transactionType: 'expense' | 'income' | 'goal' | 'bill' | 'investment',
  transactionData: {
    merchant?: string;
    note?: string;
    tag?: string;
    location?: string;
    goal_name?: string;
    bill_name?: string;
    investment_type?: string;
  }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user || !supabase) {
      return null
    }

    // Get all active rules for this user that apply to this transaction type
    const { data: rules, error } = await supabase
      .from("category_rules")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .contains("applies_to", [transactionType])
      .order("priority", { ascending: false })

    if (error || !rules || rules.length === 0) {
      return null
    }

    // Check each rule to see if it matches
    for (const rule of rules) {
      let fieldValue = '';
      
      // Get the field value based on match_field
      switch (rule.match_field) {
        case 'merchant':
          fieldValue = transactionData.merchant || '';
          break;
        case 'note':
          fieldValue = transactionData.note || '';
          break;
        case 'tag':
          fieldValue = transactionData.tag || '';
          break;
        case 'location':
          fieldValue = transactionData.location || '';
          break;
        case 'goal_name':
          fieldValue = transactionData.goal_name || '';
          break;
        case 'bill_name':
          fieldValue = transactionData.bill_name || '';
          break;
        case 'investment_type':
          fieldValue = transactionData.investment_type || '';
          break;
      }

      // Skip if field value is empty
      if (!fieldValue) continue;

      // Check if the rule matches based on the operator
      let isMatch = false;
      switch (rule.match_operator) {
        case 'equals':
          isMatch = fieldValue.toLowerCase() === rule.match_value.toLowerCase();
          break;
        case 'contains':
          isMatch = fieldValue.toLowerCase().includes(rule.match_value.toLowerCase());
          break;
        case 'starts_with':
          isMatch = fieldValue.toLowerCase().startsWith(rule.match_value.toLowerCase());
          break;
        case 'ends_with':
          isMatch = fieldValue.toLowerCase().endsWith(rule.match_value.toLowerCase());
          break;
      }

      // If we have a match, return the category ID
      if (isMatch) {
        return rule.category_id;
      }
    }

    // No matching rule found
    return null;
  } catch (error) {
    console.error("Error in applyCategoryRules:", error);
    return null;
  }
}

"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { ALL_CATEGORIES } from "@/lib/constants/categories"
import { revalidatePath } from "next/cache"
import type { Category } from "@/types/finance"
import { v4 as uuidv4 } from 'uuid'

export async function getCategories() {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { categories: [] }
    }
    
    // Get authenticated user with the secure method
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      console.error("Error getting authenticated user:", userError || "No user found")
      return { categories: [] }
    }
    
    const user = userData.user

    const { data, error } = await supabase
      .from("categories")
      .select("*, parent:parent_category_id(id, name)")
      .eq("user_id", user.id)
      .order("name")

    if (error) {
      console.error("Error fetching categories:", error)
      
      // If table doesn't exist, we don't need to create it as it should be created by the SQL
      if (error.code === "42P01") {
        console.log("Categories table doesn't exist, it should be created by the SQL script")
        
        // Return default categories as a fallback
        return { 
          categories: ALL_CATEGORIES.map(category => ({
            ...category,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        }
      }
      
      return { categories: [] }
    }

    return { categories: data }
  } catch (error) {
    console.error("Error in getCategories:", error)
    return { categories: [] }
  }
}

// Separate function for revalidation - exported as a server action
// This should only be called from client components or other server actions, not during rendering
export async function revalidateCategories() {
  "use server"
  revalidatePath("/transactions")
  revalidatePath("/categories")
  revalidatePath("/dashboard")
  revalidatePath("/budgets")
  return { revalidated: true }
}

// Check if the categories table exists
async function ensureCategoriesTableExists() {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return false
    }
    
    // Simply check if the table exists by querying it
    const { error } = await supabase
      .from("categories")
      .select("id")
      .limit(1)
    
    if (error) {
      if (error.code === "42P01") {
        console.log("Categories table doesn't exist. It should be created by the SQL script.")
        return false
      }
      console.error("Error checking if categories table exists:", error)
      return false
    }
    
    return true
  } catch (error) {
    console.error("Error ensuring categories table exists:", error)
    return false
  }
}

export async function ensureStaticCategories() {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { success: false, message: "Failed to create Supabase client", categories: [] }
    }
    
    // Get authenticated user with the secure method
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      console.error("Error getting authenticated user:", userError || "No user found")
      return { success: false, message: "User not authenticated", categories: [] }
    }
    
    const user = userData.user
    
    // Check if categories table exists
    await ensureCategoriesTableExists()
    
    // Get existing categories
    const { data: existingCategories, error: fetchError } = await supabase
      .from("categories")
      .select(
        `id,
        user_id,
        name,
        description,
        parent_category_id,
        is_temporary,
        created_at,
        updated_at`
      )
      .eq("user_id", user.id)
      .order("name")

    if (fetchError) {
      console.error("Error fetching existing categories:", fetchError)
      
      // If table doesn't exist despite our attempt to create it
      if (fetchError.code === "42P01") {
        return { 
          success: false, 
          message: "Categories table doesn't exist", 
          categories: ALL_CATEGORIES.map(cat => ({...cat, user_id: user.id})) 
        }
      }
      
      return { success: false, message: "Failed to fetch existing categories", categories: [] }
    }

    // Create a map of existing categories for quick lookup
    const existingCategoryMap = new Map()
    existingCategories?.forEach(cat => {
      existingCategoryMap.set(cat.name, cat.id)
    })

    // Prepare categories to insert with explicit typing
    interface CategoryToInsert {
      id: string;
      name: string;
      description?: string;
      parent_category_id?: string;
      is_temporary?: boolean;
      user_id: string;
      created_at: string;
      updated_at: string;
    }
    
    const now = new Date().toISOString()
    const categoriesToInsert: CategoryToInsert[] = []

    // Check all categories
    ALL_CATEGORIES.forEach(category => {
      if (!existingCategoryMap.has(category.name)) {
        // Generate a new UUID instead of using the predefined one
        categoriesToInsert.push({
          ...category,
          id: uuidv4(), // Generate a new UUID to avoid primary key conflicts
          user_id: user.id,
          created_at: now,
          updated_at: now
        })
      }
    })

    // Insert missing categories if any
    if (categoriesToInsert.length > 0) {
      // Filter out fields that don't exist in the database schema and ensure all required fields are present
      const dbSafeCategories = categoriesToInsert.map(category => {
        // Use type assertion to handle properties that might not be in the interface
        const { color, icon, is_income, ...dbCategory } = category as any;
        
        // Ensure all required fields have values
        return {
          ...dbCategory,
          user_id: user.id,  // Make sure user_id is set
          created_at: now,   // Make sure timestamps are set
          updated_at: now
        };
      });
      
      try {
        const { error: insertError } = await supabase
          .from("categories")
          .insert(dbSafeCategories)

        if (insertError) {
          console.error("Error inserting categories:", insertError)
          // Log more details about the error
          console.error("Error details:", JSON.stringify(insertError, null, 2))
          console.error("First category being inserted:", JSON.stringify(dbSafeCategories[0], null, 2))
          return { success: false, message: `Failed to insert categories: ${insertError.message}`, categories: existingCategories || [] }
        }
      } catch (insertCatchError) {
        console.error("Exception during category insertion:", insertCatchError)
        return { success: false, message: `Exception during category insertion: ${insertCatchError}`, categories: existingCategories || [] }
      }

      // Don't call revalidation during rendering - return a flag indicating revalidation is needed
      // The client component can then call revalidateCategories() as needed
    }

    return { 
      success: true, 
      message: `${categoriesToInsert.length} categories created`,
      created: categoriesToInsert.length,
      categories: (existingCategories || []) as Category[]
    }
  } catch (error) {
    console.error("Error ensuring static categories:", error)
    return { success: false, message: "An unexpected error occurred", categories: [] }
  }
}

export async function initializeUserCategories(userId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return false
    }
    
    // Convert ALL_CATEGORIES to database format with new schema
    const now = new Date().toISOString()
    const categoriesToInsert = ALL_CATEGORIES.map(category => {
      // Extract only the fields that exist in the database schema
      return {
        id: crypto.randomUUID(), // Generate UUID
        user_id: userId,
        name: category.name,
        description: null,
        parent_category_id: null,
        is_temporary: false,
        created_at: now,
        updated_at: now
      };
    })

    const { error } = await supabase
      .from("categories")
      .insert(categoriesToInsert)

    if (error) {
      console.error("Error initializing categories:", error)
      // Return false but don't throw, to allow graceful degradation
      return false
    }
    
    return true
  } catch (error) {
    console.error("Error in initializeUserCategories:", error)
    return false
  }
}

export async function getCategoryById(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return ALL_CATEGORIES.find(category => category.id === id) || null
    }
    
    // Get authenticated user with the secure method
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      console.error("Error getting authenticated user:", userError || "No user found")
      // If not authenticated, just return static category
      return ALL_CATEGORIES.find(category => category.id === id) || null
    }
    
    const user = userData.user
    
    // Try to get from database first with parent category info
    const { data, error } = await supabase
      .from("categories")
      .select("*, parent:parent_category_id(id, name)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
    
    if (error) {
      // If not found in database, check static categories
      return ALL_CATEGORIES.find(category => category.id === id) || null
    }
    
    return data
  } catch (error) {
    console.error("Error in getCategoryById:", error)
    // Find the category in our static categories as fallback
    return ALL_CATEGORIES.find(category => category.id === id) || null
  }
}

export async function createCategory(formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }
    
    // Get authenticated user with the secure method
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      throw new Error("Authentication required")
    }
    
    const user = userData.user
    
    // Check if categories table exists
    await ensureCategoriesTableExists()

    // Extract form data
    const name = formData.get("name") as string
    const description = (formData.get("description") as string) || null
    const parentCategoryId = (formData.get("parent_category_id") as string) || null
    const isTemporary = formData.get("is_temporary") === "true"
    const color = (formData.get("color") as string) || null
    const icon = (formData.get("icon") as string) || null
    const isIncome = formData.get("is_income") === "true"

    // Validate required fields
    if (!name) {
      throw new Error("Name is required")
    }

    // Create category - only include fields that exist in the database schema
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name,
        description,
        parent_category_id: parentCategoryId,
        is_temporary: isTemporary,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error("Error creating category:", error)
      throw new Error("Failed to create category")
    }

    // Revalidate categories page
    await revalidateCategories()

    return data[0]
  } catch (error) {
    console.error("Error in createCategory:", error)
    throw error
  }
}

export async function updateCategory(id: string, formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }
    
    // Get authenticated user with the secure method
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      throw new Error("Authentication required")
    }
    
    const user = userData.user

    // Verify category belongs to user
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("user_id")
      .eq("id", id)
      .single()

    if (categoryError) {
      // If table doesn't exist, return error
      if (categoryError.code === "42P01") {
        throw new Error("Categories table doesn't exist")
      }
      
      // If category not found, return error
      if (categoryError.code === "PGRST116") {
        throw new Error("Category not found")
      }
      
      throw new Error(`Database error: ${categoryError.message}`)
    }
    
    if (!category || category.user_id !== user.id) {
      throw new Error("Category not found or access denied")
    }

    // Extract form data
    const name = formData.get("name") as string
    const description = (formData.get("description") as string) || null
    const parentCategoryId = (formData.get("parent_category_id") as string) || null
    const isTemporary = formData.get("is_temporary") === "true"
    const color = (formData.get("color") as string) || null
    const icon = (formData.get("icon") as string) || null
    const isIncome = formData.get("is_income") === "true"

    // Validate required fields
    if (!name) {
      throw new Error("Name is required")
    }

    // Update category
    const { data, error } = await supabase
      .from("categories")
      .update({
        name,
        description,
        parent_category_id: parentCategoryId,
        is_temporary: isTemporary,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()

    if (error) {
      console.error("Error updating category:", error)
      throw new Error("Failed to update category")
    }

    await revalidateCategories()

    return data[0]
  } catch (error) {
    console.error("Error in updateCategory:", error)
    throw error
  }
}

export async function deleteCategory(id: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    // Verify category belongs to user
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("user_id")
      .eq("id", id)
      .single()

    if (categoryError) {
      // If table doesn't exist, return success (nothing to delete)
      if (categoryError.code === "42P01") {
        return { success: true }
      }
      
      // If category not found, return success (nothing to delete)
      if (categoryError.code === "PGRST116") {
        return { success: true }
      }
      
      throw new Error(`Database error: ${categoryError.message}`)
    }

    if (!category || category.user_id !== user.id) {
      throw new Error("Category not found or access denied")
    }

    // Check if category is in use by expenses, incomes, goals, bills, or investments
    const tables = ['expenses', 'incomes', 'financial_goals', 'bills', 'investments', 'budget_categories'];
    let isInUse = false;
    
    for (const table of tables) {
      const { count, error: countError } = await supabase
        .from(table)
        .select("id", { count: 'exact', head: true })
        .eq("category_id", id);
      
      if (countError && countError.code !== "42P01") {
        console.error(`Error checking if category is in use in ${table}:`, countError);
        continue; // Skip this table if there's an error
      }
      
      if (count && count > 0) {
        isInUse = true;
        break;
      }
    }
    
    // Also check for child categories
    const { count: childCount, error: childCountError } = await supabase
      .from("categories")
      .select("id", { count: 'exact', head: true })
      .eq("parent_category_id", id);
    
    if (!childCountError && childCount && childCount > 0) {
      isInUse = true;
    }
    
    if (isInUse) {
      throw new Error("Cannot delete category that is in use by transactions or has child categories")
    }

    // Delete category
    const { error } = await supabase.from("categories").delete().eq("id", id)

    if (error) {
      console.error("Error deleting category:", error)
      throw new Error("Failed to delete category")
    }

    // Revalidate all relevant pages
    await revalidateCategories()

    return { success: true }
  } catch (error) {
    console.error("Error in deleteCategory:", error)
    throw error
  }
}

export async function getCategorySpending(period: "week" | "month" | "year" = "month") {
  // This function returns category spending data formatted for the financial summary component
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser();

    if (!user) {
      return [];
    }

    if (!supabase) {
      console.error("Failed to create Supabase client");
      return [];
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: string;

    if (period === "week") {
      const lastWeek = new Date(now);
      lastWeek.setDate(now.getDate() - 7);
      startDate = lastWeek.toISOString().split("T")[0];
    } else if (period === "month") {
      const lastMonth = new Date(now);
      lastMonth.setMonth(now.getMonth() - 1);
      startDate = lastMonth.toISOString().split("T")[0];
    } else {
      const lastYear = new Date(now);
      lastYear.setFullYear(now.getFullYear() - 1);
      startDate = lastYear.toISOString().split("T")[0];
    }

    const endDate = now.toISOString().split("T")[0];

    // Get expense categories from expense_categories table
    const { data: expenseCategories, error: expenseCategoriesError } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("user_id", user.id);
      
    if (expenseCategoriesError) {
      console.error("Error fetching expense categories:", expenseCategoriesError);
    }
    
    // Create a map of expense categories for quick lookup
    const expenseCategoryMap = new Map();
    if (expenseCategories && expenseCategories.length > 0) {
      expenseCategories.forEach(category => {
        expenseCategoryMap.set(category.id, {
          id: category.id,
          name: category.name,
          color: category.color || getColorFromString(category.name)
        });
      });
    }
    
    // Use the categorized_expense_summary view from categories.sql
    const { data: categorySummary, error: summaryError } = await supabase
      .from("categorized_expense_summary")
      .select("*")
      .eq("user_id", user.id);

    if (summaryError) {
      console.error("Error fetching category summary:", summaryError);
      
      // If view doesn't exist, fall back to the old method
      if (summaryError.code === "42P01") {
        // Get expenses for the period
        const { data: expenses, error: expensesError } = await supabase
          .from("expenses")
          .select(`
            amount,
            category_id,
            date
          `)
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate);

        if (expensesError) {
          console.error("Error fetching expenses:", expensesError);
          if (expensesError.code === "42P01") {
            return [];
          }
          throw new Error(`Database error: ${expensesError.message}`);
        }

        // Create a map to store category totals
        const categoryTotals = new Map<string, { total_amount: number; transaction_count: number }>();

        // Calculate totals for each category
        expenses.forEach(expense => {
          const categoryId = expense.category_id;
          if (!categoryId) return;

          if (!categoryTotals.has(categoryId)) {
            categoryTotals.set(categoryId, { total_amount: 0, transaction_count: 0 });
          }

          const categoryData = categoryTotals.get(categoryId)!;
          categoryData.total_amount += expense.amount;
          categoryData.transaction_count += 1;
        });

        // Get user categories
        const { data: userCategories, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .eq("user_id", user.id);
        
        // Combine categories from database and static categories
        const allCategories = categoriesError || !userCategories || userCategories.length === 0
          ? ALL_CATEGORIES
          : userCategories;

        // Combine with category data
        const spendingByCategory = allCategories
          .map(category => {
            const totals = categoryTotals.get(category.id) || { total_amount: 0, transaction_count: 0 };
            return {
              category_id: category.id,
              category_name: category.name,
              color: category.color,
              icon: category.icon,
              total_amount: totals.total_amount,
              transaction_count: totals.transaction_count
            };
          })
          .filter(category => category.transaction_count > 0) // Only include categories with transactions
          .sort((a, b) => b.total_amount - a.total_amount); // Sort by amount descending

        return spendingByCategory;
      }
      
      throw new Error(`Database error: ${summaryError.message}`);
    }

    // Get user categories to get color and icon information
    const { data: userCategories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id);
    
    // Create a map for quick category lookup
    const categoryMap = new Map();
    if (userCategories) {
      userCategories.forEach(cat => {
        categoryMap.set(cat.id, cat);
      });
    }

    // Function to generate a consistent color based on category name
    function getColorFromString(str: string) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      let color = '#';
      for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
      }
      return color;
    }
    
    // Format the summary data
    const spendingByCategory = categorySummary
      .map(summary => {
        // First check if we have the category in our expense categories map
        const expenseCategory = expenseCategoryMap.get(summary.category_id);
        
        // Then check the user categories map as fallback
        const userCategory = categoryMap.get(summary.category_id) || {};
        
        // Determine the category name, prioritizing real categories
        let categoryName = 'Uncategorized';
        if (expenseCategory) {
          categoryName = expenseCategory.name;
        } else if (summary.category_name) {
          categoryName = summary.category_name;
        } else if (userCategory.name) {
          categoryName = userCategory.name;
        }
        
        // Determine the color, prioritizing real categories
        let categoryColor;
        if (expenseCategory && expenseCategory.color) {
          categoryColor = expenseCategory.color;
        } else if (userCategory.color) {
          categoryColor = userCategory.color;
        } else {
          categoryColor = getColorFromString(categoryName);
        }
        
        return {
          category_id: summary.category_id,
          category_name: categoryName,
          name: categoryName, // Add name field for compatibility with financial summary component
          color: categoryColor,
          icon: userCategory.icon || null,
          total_amount: summary.total_spent || 0,
          amount: summary.total_spent || 0, // Add amount field for compatibility with financial summary component
          transaction_count: summary.transaction_count || 1,
          is_recurring: summary.is_recurring || false // Add flag for recurring expenses
        };
      })
      .filter(category => (category.total_amount > 0 || category.amount > 0)) // Only include categories with spending
      .sort((a, b) => (b.amount || b.total_amount || 0) - (a.amount || a.total_amount || 0)); // Sort by amount descending

    return spendingByCategory;
  } catch (error) {
    console.error("Error in getCategorySpending:", error);
    return [];
  }
}

"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// =================================================================================
// Type Definitions
// =================================================================================

export interface BudgetCategory {
  id: string;
  name: string;
  amount: number;
  color?: string;
  subcategories: BudgetCategory[];
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  start_date: string;
  end_date?: string | null;
  categories: BudgetCategory[];
  total_allocated?: number;
}

// =================================================================================
// Main Public Functions
// =================================================================================

/**
 * Fetches all budgets for the authenticated user.
 */
export async function getBudgets(): Promise<Budget[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const user = await getAuthenticatedUser();
  if (!user) return [];

  let { data: budgets, error } = await supabase
    .from("budgets")
    .select("id, name, amount, start_date, end_date, categories")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false });

  // Fallback if 'categories' column doesn't exist
  if (error && error.code === '42703') {
    console.warn("Missing 'categories' column in 'budgets' table. Fetching without it.");
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("budgets")
      .select("id, name, amount, start_date, end_date")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });

    if (fallbackError) {
      console.error("Error fetching budgets (fallback):", fallbackError);
      throw new Error(`Failed to fetch budgets: ${fallbackError.message}`);
    }
    budgets = fallbackData;
    error = null; // Clear the error to proceed
  }

  if (error) {
    console.error("Error fetching budgets:", error);
    throw new Error(`Failed to fetch budgets: ${error.message}`);
  }

  return (budgets || []).map(budget => ({
    ...budget,
    categories: budget.categories || [], // Ensure categories is an array
    total_allocated: calculateTotalAllocated(budget.categories || []),
  }));
}

/**
 * Fetches a single budget by its ID.
 */
export async function getBudgetById(id: string): Promise<Budget | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Failed to create Supabase client");
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Authentication required");

  const { data: budget, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error(`Error fetching budget ${id}:`, error);
    throw new Error(`Failed to fetch budget: ${error.message}`);
  }
  if (!budget) return null;

  return {
    ...budget,
    total_allocated: calculateTotalAllocated(budget.categories || []),
  };
}

/**
 * Creates a new budget with its category hierarchy stored in a JSONB column.
 */
export async function createBudget(budgetData: Omit<Budget, 'id' | 'total_allocated'>) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Failed to create Supabase client");
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Authentication required");

  // Explicitly remove transient properties that shouldn't be in the DB
  const { total_allocated, ...dbSafeData } = budgetData as any;
  const insertData = { ...dbSafeData, user_id: user.id };

  // Sanitize date fields to prevent DB errors
  if (insertData.end_date === '') {
    insertData.end_date = null;
  }
  if (!insertData.start_date) {
    throw new Error("Start date is required and cannot be empty.");
  }
  // Ensure end_date is never NULL to satisfy NOT NULL constraint
  if (insertData.end_date == null) {
    insertData.end_date = insertData.start_date;
  }

  let { data: budget, error } = await supabase
    .from("budgets")
    .insert(insertData)
    .select()
    .single();

  // Fallback if 'categories' column doesn't exist
  if (error && (error.code === '42703' || error.code === 'PGRST204')) {
    console.warn("Missing 'categories' column. Attempting to create budget without it.");
    const { categories, ...fallbackData } = insertData;
    const { data: fallbackBudget, error: fallbackError } = await supabase
      .from("budgets")
      .insert(fallbackData)
      .select()
      .single();

    if (fallbackError) {
      console.error("Error creating budget (fallback):", fallbackError);
      throw new Error(`Error creating budget: ${fallbackError.message}`);
    }
    budget = fallbackBudget;
    error = null; // Clear error
  }

  if (error) {
    console.error("Error creating budget:", error);
    throw new Error(`Error creating budget: ${error.message}`);
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return budget;
}

/**
 * Updates an existing budget, replacing its category hierarchy.
 */
export async function updateBudget(id: string, budgetData: Partial<Omit<Budget, 'id' | 'total_allocated'>>) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Failed to create Supabase client");
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Authentication required");

  // Explicitly remove transient properties that shouldn't be in the DB
  const { total_allocated, ...updateData } = budgetData as any;

  // Sanitize date fields to prevent DB errors
  if (updateData.end_date === '') {
    updateData.end_date = null;
  }
  if (updateData.start_date === '') {
    throw new Error("Start date cannot be updated to be empty.");
  }
  // Ensure end_date is never NULL
  if (updateData.end_date == null && updateData.start_date) {
    updateData.end_date = updateData.start_date;
  }

  let { data: budget, error } = await supabase
    .from("budgets")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  // Fallback if 'categories' column doesn't exist
  if (error && (error.code === '42703' || error.code === 'PGRST204')) {
    console.warn(`Missing 'categories' column. Attempting to update budget ${id} without it.`);
    const { categories, ...fallbackData } = updateData;
    const { data: fallbackBudget, error: fallbackError } = await supabase
      .from("budgets")
      .update(fallbackData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    
    if (fallbackError) {
      console.error(`Error updating budget ${id} (fallback):`, fallbackError);
      throw new Error(`Error updating budget: ${fallbackError.message}`);
    }
    budget = fallbackBudget;
    error = null; // Clear error
  }

  if (error) {
    console.error(`Error updating budget ${id}:`, error);
    throw new Error(`Error updating budget: ${error.message}`);
  }

  revalidatePath(`/budgets/${id}`);
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return budget;
}

/**
 * Deletes a budget.
 */
export async function deleteBudget(id: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Failed to create Supabase client");
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error(`Error deleting budget ${id}:`, error);
    throw new Error(`Failed to delete budget: ${error.message}`);
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { success: true };
}

// =================================================================================
// Internal Helper Functions
// =================================================================================

/**
 * Recursively calculates the total allocated amount from a category tree.
 */
function calculateTotalAllocated(categories: BudgetCategory[]): number {
  let total = 0;
  for (const category of categories) {
    if (category.subcategories && category.subcategories.length > 0) {
      total += calculateTotalAllocated(category.subcategories);
    } else {
      total += category.amount || 0;
    }
  }
  return total;
}

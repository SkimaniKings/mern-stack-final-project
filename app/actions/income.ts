"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

// Get the current user ID from the session
export async function getCurrentUserId() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Failed to create Supabase client");
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.error("Error getting user:", error);
    throw new Error("User not authenticated");
  }

  return user.id;
}

// Types based on the new income.sql schema
export type IncomeRecurrenceFrequency = "weekly" | "bi_weekly" | "monthly" | "quarterly" | "semi_annual" | "annual" | "none";
export type TaxType = "pre_tax" | "post_tax";

export interface Income {
  id: string;
  user_id: string;
  source_name: string;
  amount: number;
  currency: string;
  category_id: string | null;
  is_taxable: boolean;
  tax_class: TaxType;
  recurrence: IncomeRecurrenceFrequency;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  monthly_equivalent_amount: number;
  created_at: string;
  updated_at: string;
  category?: IncomeCategory;
  deductions?: IncomeDeduction[];
  hustles?: IncomeHustle[];
  // Additional calculated fields
  total_deductions?: number;
  total_hustles?: number;
  adjusted_amount?: number;
}

export interface IncomeCategory {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeDeduction {
  id: string;
  income_id: string;
  name: string;
  amount: number;
  tax_class: TaxType;
  created_at: string;
}

export interface IncomeHustle {
  id: string;
  user_id: string;
  income_id: string;
  hustle_name: string;
  hustle_amount: number;
  created_at: string;
}

// Helper function to convert amounts to monthly equivalent based on recurrence
function convertToMonthlyAmount(amount: number, recurrence: IncomeRecurrenceFrequency): number {
  switch (recurrence) {
    case "weekly":
      return amount * 52 / 12;
    case "bi_weekly":
      return amount * 26 / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "semi_annual":
      return amount / 6;
    case "annual":
      return amount / 12;
    default:
      return amount;
  }
}

// Get all income entries for the current user
export async function getIncomes(timestamp?: number) {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to create Supabase client");
    }

    const { data, error } = await supabase
      .from("incomes")
      .select(`
        *,
        category:income_categories(id, name),
        deductions:income_deductions(*),
        hustles:income_hustles(*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching incomes:", error);
      return [];
    }

    // Process each income to calculate adjusted amounts with deductions and side hustles
    if (data && data.length > 0) {
      data.forEach(income => {
        // Calculate total deductions
        let totalDeductions = 0;
        if (income.deductions && Array.isArray(income.deductions)) {
          totalDeductions = income.deductions.reduce((sum: number, deduction: any) => {
            return sum + (deduction.amount || 0);
          }, 0);
        }
        
        // Calculate total side hustles
        let totalHustles = 0;
        if (income.hustles && Array.isArray(income.hustles)) {
          totalHustles = income.hustles.reduce((sum: number, hustle: any) => {
            return sum + (hustle.hustle_amount || 0);
          }, 0);
        }
        
        // Adjust the base amount with deductions and side hustles
        const adjustedAmount = income.amount - totalDeductions + totalHustles;
        
        // Recalculate monthly equivalent with the adjusted amount
        income.monthly_equivalent_amount = convertToMonthlyAmount(adjustedAmount, income.recurrence);
        
        // Add calculated fields for UI display
        income.total_deductions = totalDeductions;
        income.total_hustles = totalHustles;
        income.adjusted_amount = adjustedAmount;
      });
    }

    return data || [];
  } catch (error) {
    console.error("Error in getIncomes:", error);
    return [];
  }
}

// Get a specific income by ID
export async function getIncomeById(id: string) {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to create Supabase client");
    }

    const { data, error } = await supabase
      .from("incomes")
      .select(`
        *,
        category:income_categories(id, name),
        deductions:income_deductions(*),
        hustles:income_hustles(*)
      `)
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching income:", error);
      throw new Error("Failed to fetch income");
    }

    // Calculate adjusted amount with deductions and side hustles
    if (data) {
      // Calculate total deductions
      let totalDeductions = 0;
      if (data.deductions && Array.isArray(data.deductions)) {
        totalDeductions = data.deductions.reduce((sum: number, deduction: any) => {
          return sum + (deduction.amount || 0);
        }, 0);
      }
      
      // Calculate total side hustles
      let totalHustles = 0;
      if (data.hustles && Array.isArray(data.hustles)) {
        totalHustles = data.hustles.reduce((sum: number, hustle: any) => {
          return sum + (hustle.hustle_amount || 0);
        }, 0);
      }
      
      // Adjust the base amount with deductions and side hustles
      const adjustedAmount = data.amount - totalDeductions + totalHustles;
      
      // Recalculate monthly equivalent with the adjusted amount
      data.monthly_equivalent_amount = convertToMonthlyAmount(adjustedAmount, data.recurrence);
      
      // Add calculated fields for UI display
      data.total_deductions = totalDeductions;
      data.total_hustles = totalHustles;
      data.adjusted_amount = adjustedAmount;
    }

    return data;
  } catch (error) {
    console.error("Error in getIncomeById:", error);
    throw error;
  }
}

// Create default income categories for a user
export async function createDefaultIncomeCategories(userId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Failed to create Supabase client");
  }

  const defaultCategories = [
    { name: "Salary", user_id: userId },
    { name: "Freelance", user_id: userId },
    { name: "Business", user_id: userId },
    { name: "Investments", user_id: userId },
    { name: "Rental", user_id: userId },
    { name: "Side Hustle", user_id: userId },
    { name: "Other", user_id: userId }
  ];

  const { data, error } = await supabase
    .from("income_categories")
    .insert(defaultCategories)
    .select();

  if (error) {
    console.error("Error creating default income categories:", error);
    return [];
  }

  return data || [];
}

// Get all income categories
export async function getIncomeCategories() {
  const userId = await getCurrentUserId();
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Failed to create Supabase client");
  }

  // Get existing categories
  const { data, error } = await supabase
    .from("income_categories")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching income categories:", error);
    throw new Error("Failed to fetch income categories");
  }

  // If no categories exist, create default ones
  if (!data || data.length === 0) {
    console.log("No income categories found, creating defaults");
    const defaultCategories = await createDefaultIncomeCategories(userId);
    return defaultCategories;
  }

  return data;
}

// Create a new income category
export async function createIncomeCategory(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to create Supabase client");
    }

    const name = formData.get("name") as string;
    if (!name) {
      throw new Error("Name is required");
    }

    const parentId = formData.get("parent_id") as string || null;

    const { data, error } = await supabase
      .from("income_categories")
      .insert({
        user_id: userId,
        name,
        parent_id: parentId
      })
      .select();

    if (error) {
      console.error("Error creating income category:", error);
      throw new Error(`Failed to create income category: ${error.message}`);
    }

    revalidatePath("/income");
    return { id: data[0].id };
  } catch (error) {
    console.error("Error in createIncomeCategory:", error);
    throw error;
  }
}

// Create a new income entry
export async function createIncome(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to create Supabase client");
    }

    // Validate required fields
    const sourceName = formData.get("source_name") as string;
    if (!sourceName) {
      throw new Error("Source name is required");
    }

    const amountStr = formData.get("amount") as string;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }

    const recurrence = formData.get("recurrence") as IncomeRecurrenceFrequency;
    if (!recurrence) {
      throw new Error("Recurrence is required");
    }

    const startDate = formData.get("start_date") as string;
    if (!startDate) {
      throw new Error("Start date is required");
    }

    // Optional fields
    const categoryId = formData.get("category_id") as string || null;
    const endDate = formData.get("end_date") as string || null;
    const notes = formData.get("notes") as string || null;
    const currency = formData.get("currency") as string || "USD";
    const isTaxable = formData.get("is_taxable") === "true";
    const taxClass = formData.get("tax_class") as TaxType || "post_tax";

    // Parse deductions and side hustles if they exist
    let totalDeductions = 0;
    let totalHustles = 0;
    
    // Process deductions
    const deductionsJson = formData.get("deductions") as string;
    let deductions: any[] = [];
    if (deductionsJson) {
      try {
        deductions = JSON.parse(deductionsJson);
        if (Array.isArray(deductions) && deductions.length > 0) {
          // Calculate total deductions amount
          totalDeductions = deductions.reduce((sum, deduction) => {
            return sum + (deduction.amount || 0);
          }, 0);
        }
      } catch (e) {
        console.error("Error parsing deductions for monthly calculation:", e);
      }
    }
    
    // Process side hustles
    const hustlesJson = formData.get("hustles") as string;
    let hustles: any[] = [];
    if (hustlesJson) {
      try {
        hustles = JSON.parse(hustlesJson);
        if (Array.isArray(hustles) && hustles.length > 0) {
          // Calculate total side hustles amount
          totalHustles = hustles.reduce((sum, hustle) => {
            return sum + (hustle.amount || 0);
          }, 0);
        }
      } catch (e) {
        console.error("Error parsing side hustles for monthly calculation:", e);
      }
    }
    
    // Calculate adjusted amount with deductions and side hustles
    const adjustedAmount = amount - totalDeductions + totalHustles;
    
    // Calculate monthly equivalent amount for display purposes
    const monthlyEquivalentAmount = convertToMonthlyAmount(adjustedAmount, recurrence);

    const incomeData = {
      user_id: userId,
      source_name: sourceName,
      amount,
      currency,
      category_id: categoryId,
      is_taxable: isTaxable,
      tax_class: taxClass,
      recurrence,
      start_date: startDate,
      end_date: endDate,
      notes
    };

    console.log("Income data to insert:", incomeData);

    const { data, error } = await supabase
      .from("incomes")
      .insert(incomeData)
      .select();

    if (error) {
      console.error("Error creating income:", error);
      throw new Error(`Failed to create income: ${error.message}`);
    }

    // Process deductions if any
    if (deductions.length > 0) {
      try {
        // Filter out any invalid deductions (empty name or zero amount)
        const validDeductions = deductions.filter(d => d.name && d.amount > 0);
        
        if (validDeductions.length > 0) {
          // Log for debugging
          console.log("Saving deductions:", validDeductions);
          
          const deductionsToInsert = validDeductions.map(deduction => ({
            income_id: data[0].id,
            name: deduction.name,
            amount: deduction.amount,
            tax_class: deduction.tax_class || "pre_tax"
          }));

          const { error: deductionsError } = await supabase
            .from("income_deductions")
            .insert(deductionsToInsert);

          if (deductionsError) {
            console.error("Error adding deductions:", deductionsError);
          } else {
            console.log(`Successfully added ${validDeductions.length} deductions`);
          }
        }
      } catch (e) {
        console.error("Error processing deductions:", e);
      }
    }

    // Process side hustles if any
    if (hustles.length > 0) {
      try {
        // Filter out any invalid hustles (empty name or zero amount)
        const validHustles = hustles.filter(h => h.name && h.amount > 0);
        
        if (validHustles.length > 0) {
          // Log for debugging
          console.log("Saving side hustles:", validHustles);
          
          const hustlesToInsert = validHustles.map(hustle => ({
            user_id: userId,
            income_id: data[0].id,
            hustle_name: hustle.name,
            hustle_amount: hustle.amount
          }));

          const { error: hustlesError } = await supabase
            .from("income_hustles")
            .insert(hustlesToInsert);

          if (hustlesError) {
            console.error("Error adding side hustles:", hustlesError);
          } else {
            console.log(`Successfully added ${validHustles.length} side hustles`);
          }
        }
      } catch (e) {
        console.error("Error processing side hustles:", e);
      }
    }

    revalidatePath("/income");
    return { id: data[0].id };
  } catch (error) {
    console.error("Error in createIncome:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to create income: ${error.message}`);
    }
    throw new Error("Failed to create income");
  }
}

// Update an existing income
export async function updateIncome(id: string, formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to create Supabase client");
    }

    // First check if the income exists and belongs to the user
    const { data: existingIncome, error: fetchError } = await supabase
      .from("incomes")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching income to update:", fetchError);
      throw new Error("Income not found or you don't have permission to update it");
    }

    // Prepare update data
    const updateData: Record<string, any> = {};

    // Process all possible fields
    const sourceName = formData.get("source_name") as string;
    if (sourceName) updateData.source_name = sourceName;

    const amountStr = formData.get("amount") as string;
    if (amountStr) {
      const amount = Number(amountStr);
      if (!isNaN(amount) && amount > 0) {
        updateData.amount = amount;
      }
    }

    const recurrence = formData.get("recurrence") as IncomeRecurrenceFrequency;
    if (recurrence) updateData.recurrence = recurrence;

    const startDate = formData.get("start_date") as string;
    if (startDate) updateData.start_date = startDate;

    const endDate = formData.get("end_date") as string;
    updateData.end_date = endDate || null;

    const categoryId = formData.get("category_id") as string;
    updateData.category_id = categoryId || null;

    const notes = formData.get("notes") as string;
    updateData.notes = notes || null;

    const currency = formData.get("currency") as string;
    if (currency) updateData.currency = currency;

    const isTaxable = formData.get("is_taxable");
    if (isTaxable !== null) {
      updateData.is_taxable = isTaxable === "true";
    }

    const taxClass = formData.get("tax_class") as TaxType;
    if (taxClass) updateData.tax_class = taxClass;

    // Parse deductions and side hustles if they exist
    let totalDeductions = 0;
    let totalHustles = 0;
    
    // Process deductions
    const deductionsJson = formData.get("deductions") as string;
    let deductions: any[] = [];
    if (deductionsJson) {
      try {
        deductions = JSON.parse(deductionsJson);
        if (Array.isArray(deductions) && deductions.length > 0) {
          // Calculate total deductions amount
          totalDeductions = deductions.reduce((sum, deduction) => {
            return sum + (deduction.amount || 0);
          }, 0);
        }
      } catch (e) {
        console.error("Error parsing deductions for monthly calculation:", e);
      }
    }
    
    // Process side hustles
    const hustlesJson = formData.get("hustles") as string;
    let hustles: any[] = [];
    if (hustlesJson) {
      try {
        hustles = JSON.parse(hustlesJson);
        if (Array.isArray(hustles) && hustles.length > 0) {
          // Calculate total side hustles amount
          totalHustles = hustles.reduce((sum, hustle) => {
            return sum + (hustle.amount || 0);
          }, 0);
        }
      } catch (e) {
        console.error("Error parsing side hustles for monthly calculation:", e);
      }
    }
    
    // Calculate adjusted amount with deductions and side hustles
    const adjustedAmount = updateData.amount - totalDeductions + totalHustles;
    
    // Calculate monthly equivalent amount for display purposes only
    const displayMonthlyEquivalentAmount = convertToMonthlyAmount(adjustedAmount, updateData.recurrence || recurrence);

    console.log("Income data to update:", updateData);

    // Update the income
    const { error: updateError } = await supabase
      .from("incomes")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating income:", updateError);
      throw new Error(`Failed to update income: ${updateError.message}`);
    }

    // Handle deductions updates
    if (deductionsJson) {
      try {
        console.log("Processing deductions JSON:", deductionsJson);
        
        // First delete existing deductions
        const { error: deleteError } = await supabase
          .from("income_deductions")
          .delete()
          .eq("income_id", id);
          
        if (deleteError) {
          console.error("Error deleting existing deductions:", deleteError);
        } else {
          console.log("Successfully deleted existing deductions for income ID:", id);
        }

        // Then add new ones
        if (Array.isArray(deductions) && deductions.length > 0) {
          // Filter out any invalid deductions (empty name or zero amount)
          const validDeductions = deductions.filter(d => d.name && d.amount > 0);
          console.log("Valid deductions after filtering:", validDeductions);
          
          if (validDeductions.length > 0) {
            const deductionsToInsert = validDeductions.map(deduction => ({
              income_id: id,
              name: deduction.name,
              amount: deduction.amount,
              tax_class: deduction.tax_class || "pre_tax" // Ensure tax_class has a default value
            }));
            
            console.log("Deductions to insert:", deductionsToInsert);
            
            const { error: deductionsError } = await supabase
              .from("income_deductions")
              .insert(deductionsToInsert);

            if (deductionsError) {
              console.error("Error adding deductions:", deductionsError);
            } else {
              console.log(`Successfully added ${validDeductions.length} deductions for income ID: ${id}`);
            }
          } else {
            console.log("No valid deductions to add after filtering");
          }
        } else {
          console.log("No deductions to add or invalid array format");
        }
      } catch (e) {
        console.error("Error processing deductions:", e);
      }
    } else {
      console.log("No deductions JSON data provided");
    }

    // Handle side hustles updates
    if (hustlesJson) {
      try {
        console.log("Processing side hustles JSON:", hustlesJson);
        
        // First delete existing hustles
        const { error: deleteError } = await supabase
          .from("income_hustles")
          .delete()
          .eq("income_id", id);
          
        if (deleteError) {
          console.error("Error deleting existing side hustles:", deleteError);
        } else {
          console.log("Successfully deleted existing side hustles for income ID:", id);
        }

        // Then add new ones
        if (Array.isArray(hustles) && hustles.length > 0) {
          // Filter out any invalid hustles (empty name or zero amount)
          const validHustles = hustles.filter(h => h.name && h.amount > 0);
          console.log("Valid hustles after filtering:", validHustles);
          
          if (validHustles.length > 0) {
            const hustlesToInsert = validHustles.map(hustle => ({
              user_id: userId,
              income_id: id,
              hustle_name: hustle.name,
              hustle_amount: hustle.amount
            }));
            
            console.log("Side hustles to insert:", hustlesToInsert);
            
            const { error: hustlesError } = await supabase
              .from("income_hustles")
              .insert(hustlesToInsert);

            if (hustlesError) {
              console.error("Error adding side hustles:", hustlesError);
            } else {
              console.log(`Successfully added ${validHustles.length} side hustles for income ID: ${id}`);
            }
          } else {
            console.log("No valid side hustles to add after filtering");
          }
        } else {
          console.log("No side hustles to add or invalid array format");
        }
      } catch (e) {
        console.error("Error processing side hustles:", e);
      }
    } else {
      console.log("No side hustles JSON data provided");
    }

    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    console.error("Error in updateIncome:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to update income: ${error.message}`);
    }
    throw new Error("Failed to update income");
  }
}

// Delete an income
export async function deleteIncome(id: string) {
  try {
    const userId = await getCurrentUserId();
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to create Supabase client");
    }

    // First check if the income exists and belongs to the user
    const { data: existingIncome, error: fetchError } = await supabase
      .from("incomes")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching income to delete:", fetchError);
      throw new Error("Income not found or you don't have permission to delete it");
    }

    // Delete the income (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from("incomes")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error deleting income:", deleteError);
      throw new Error(`Failed to delete income: ${deleteError.message}`);
    }

    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteIncome:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete income: ${error.message}`);
    }
    throw new Error("Failed to delete income");
  }
}

// Calculate income diversification score using a client-side implementation
export async function calculateIncomeDiversification() {
  try {
    // Get all incomes with their categories to calculate diversification
    const incomes = await getIncomes();
    
    if (!incomes || incomes.length === 0) {
      console.log("No income sources found for diversification calculation");
      return 0; // No diversification if no income sources
    }
    
    if (incomes.length === 1) {
      console.log("Only one income source found, returning base diversification score");
      return 25; // Base diversification for a single income source
    }
    
    // Calculate total monthly income - monthly_equivalent_amount already includes deductions and hustles
    const totalMonthlyIncome = incomes.reduce((sum, income) => {
      return sum + (income.monthly_equivalent_amount || 0);
    }, 0);
    
    if (totalMonthlyIncome <= 0) {
      console.log("Total monthly income is zero or negative, returning 0 score");
      return 0;
    }
    
    // Get all income categories to ensure we have proper category data
    const allCategories = await getIncomeCategories();
    const categoryLookup = new Map<string, string>();
    
    // Create a lookup map of category IDs to names
    if (allCategories && allCategories.length > 0) {
      allCategories.forEach(category => {
        categoryLookup.set(category.id, category.name);
      });
    }
    
    // Group incomes by category
    const categoryMap = new Map<string, number>();
    let uncategorizedAmount = 0;
    
    // Debug logging
    console.log(`Processing ${incomes.length} income sources for diversification calculation`);
    
    incomes.forEach(income => {
      // Get category name using the lookup map first, then fallback to income.category?.name
      let categoryName: string;
      
      if (income.category_id && categoryLookup.has(income.category_id)) {
        // Use the category name from our lookup
        categoryName = categoryLookup.get(income.category_id)!;
      } else if (income.category && income.category.name) {
        // Use the category name from the joined data
        categoryName = income.category.name;
      } else {
        // Fallback to a more descriptive uncategorized name
        categoryName = "Other Income";
        uncategorizedAmount += (income.monthly_equivalent_amount || 0);
      }
      
      const monthlyAmount = income.monthly_equivalent_amount || 0;
      
      console.log(`Income: ${income.source_name}, Category: ${categoryName}, Monthly Amount: ${monthlyAmount}`);
      
      if (categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, categoryMap.get(categoryName)! + monthlyAmount);
      } else {
        categoryMap.set(categoryName, monthlyAmount);
      }
    });
    
    // Log the category distribution
    console.log("Income distribution by category:");
    categoryMap.forEach((amount, category) => {
      const percentage = ((amount / totalMonthlyIncome) * 100).toFixed(2);
      console.log(`${category}: $${amount.toFixed(2)} (${percentage}%)`);
    });
    
    // If we have uncategorized income and it's the only category, create at least one more category
    // to avoid division by zero in the HHI calculation
    if (categoryMap.size === 1 && categoryMap.has("Other Income")) {
      console.log("Only uncategorized income found, creating a dummy category for calculation");
      categoryMap.set("Primary Income", totalMonthlyIncome * 0.8);
      categoryMap.set("Other Income", totalMonthlyIncome * 0.2);
    }
    
    // Calculate Herfindahl-Hirschman Index (HHI) - a measure of market concentration
    // Lower HHI means better diversification
    let hhi = 0;
    
    categoryMap.forEach((amount, category) => {
      const marketShare = amount / totalMonthlyIncome;
      hhi += marketShare * marketShare;
    });
    
    console.log(`HHI value: ${hhi.toFixed(4)}`);
    
    // Convert HHI to a diversification score (0-100)
    // HHI ranges from 1/n (perfect diversification) to 1 (complete concentration)
    // where n is the number of categories
    const minHHI = 1 / Math.max(categoryMap.size, 2); // Ensure at least 2 categories for calculation
    const normalizedHHI = (hhi - minHHI) / (1 - minHHI);
    
    // Convert to a 0-100 score where 100 is perfect diversification
    const diversificationScore = Math.round((1 - normalizedHHI) * 100);
    
    // Apply some adjustments based on number of income sources
    const sourceCountBonus = Math.min(incomes.length * 5, 25);
    
    // Final score is a weighted combination
    const finalScore = Math.min(Math.round(diversificationScore * 0.75 + sourceCountBonus), 100);
    
    console.log(`Diversification calculation - Raw score: ${diversificationScore}, Source bonus: ${sourceCountBonus}, Final score: ${finalScore}`);
    
    return finalScore;
  } catch (error) {
    console.error("Error in calculateIncomeDiversification:", error);
    return 50; // Return a default middle value on error
  }
}

// Get total monthly income
export async function getTotalMonthlyIncome() {
  try {
    // Get all incomes - monthly_equivalent_amount already includes deductions and side hustles
    const incomes = await getIncomes();
    
    if (!incomes || incomes.length === 0) {
      return 0;
    }
    
    // Sum up all monthly equivalent amounts
    const total = incomes.reduce((sum, income) => {
      return sum + (income.monthly_equivalent_amount || 0);
    }, 0);
    
    return total;
  } catch (error) {
    console.error("Error in getTotalMonthlyIncome:", error);
    return 0;
  }
}

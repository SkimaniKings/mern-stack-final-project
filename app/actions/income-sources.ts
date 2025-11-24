"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"
import { getIncomes, createIncome, updateIncome, deleteIncome, calculateIncomeDiversification as getIncomeDiversificationScore, getCurrentUserId } from "./income"
import type { Income } from "./income"

// Get the current user ID from the session
async function getUserId() {
  return await getCurrentUserId()
}

// Adapter function to convert from the new Income schema to the old IncomeSource schema
function adaptIncomeToIncomeSource(income: Income) {
  return {
    id: income.id,
    user_id: income.user_id,
    name: income.source_name,
    type: income.category?.name || "salary",
    amount: income.amount,
    frequency: mapRecurrenceToFrequency(income.recurrence),
    currency: income.currency,
    start_date: income.start_date,
    end_date: income.end_date,
    notes: income.notes,
    created_at: income.created_at,
    is_active: true,
    category: income.category?.name
  }
}

// Map the new recurrence values to the old frequency values
function mapRecurrenceToFrequency(recurrence: string): string {
  switch (recurrence) {
    case "none": return "one-time";
    case "weekly": return "weekly";
    case "bi_weekly": return "bi-weekly";
    case "monthly": return "monthly";
    case "quarterly": return "quarterly";
    case "semi_annual": return "semi-annual";
    case "annual": return "annually";
    default: return "monthly";
  }
}

// Map the old frequency values to the new recurrence values
function mapFrequencyToRecurrence(frequency: string): string {
  switch (frequency) {
    case "one-time": return "none";
    case "weekly": return "weekly";
    case "bi-weekly": return "bi_weekly";
    case "monthly": return "monthly";
    case "quarterly": return "quarterly";
    case "semi-annual": return "semi_annual";
    case "annually": return "annual";
    default: return "monthly";
  }
}

// Compatibility layer for getIncomeSources
export async function getIncomeSources(timestamp?: number) {
  try {
    // Get incomes from the new schema
    const incomes = await getIncomes(timestamp);
    
    // Convert to the old format
    return incomes.map(adaptIncomeToIncomeSource);
  } catch (error) {
    console.error("Error fetching income sources:", error);
    throw new Error("Failed to fetch income sources");
  }
}

// Compatibility layer for getIncomeSourceById
export async function getIncomeSourceById(id: string, timestamp?: number) {
  try {
    // Get the income from the new schema
    const income = await getIncomeById(id);
    
    if (!income) {
      return null;
    }
    
    // Convert to the old format
    return adaptIncomeToIncomeSource(income);
  } catch (error) {
    console.error("Error in getIncomeSourceById:", error);
    throw error;
  }
}

// Helper function to get income by ID
async function getIncomeById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new Error("Failed to create Supabase client");
    }
    
    const { data, error } = await supabase
      .from("incomes")
      .select("*, category:income_categories(id, name)")
      .eq("id", id)
      .single();
      
    if (error) {
      console.error("Error fetching income:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getIncomeById:", error);
    return null;
  }
}

// Compatibility layer for createIncomeSource
export async function createIncomeSource(formData: FormData) {
  try {
    // Convert from old format to new format
    const newFormData = new FormData();
    
    // Map fields from old format to new format
    newFormData.append("source_name", formData.get("name") as string);
    newFormData.append("amount", formData.get("amount") as string);
    
    // Map frequency to recurrence
    const oldFrequency = formData.get("frequency") as string;
    const recurrence = mapFrequencyToRecurrence(oldFrequency);
    newFormData.append("recurrence", recurrence);
    
    // Map type to category_id (would need to look up or create the category)
    // For now, we'll leave category_id as null
    
    // Copy other fields
    if (formData.get("start_date")) newFormData.append("start_date", formData.get("start_date") as string);
    if (formData.get("end_date")) newFormData.append("end_date", formData.get("end_date") as string);
    if (formData.get("notes")) newFormData.append("notes", formData.get("notes") as string);
    if (formData.get("currency")) newFormData.append("currency", formData.get("currency") as string);
    
    // Set is_taxable and tax_class
    newFormData.append("is_taxable", "true");
    newFormData.append("tax_class", "post_tax");
    
    // Create using the new function
    const result = await createIncome(newFormData);
    
    return result;
  } catch (error) {
    console.error("Unexpected error in createIncomeSource:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to create income source: ${error.message}`);
    }
    throw error;
  }
}

// Compatibility layer for updateIncomeSource
export async function updateIncomeSource(id: string, formData: FormData) {
  console.log("updateIncomeSource called with ID:", id);
  console.log("Form data received:", Object.fromEntries(formData.entries()));
  
  try {
    const userId = await getUserId()
    console.log("Current user ID:", userId);
    
    const supabase = await createServerSupabaseClient()

    // Validate inputs before starting database operations
    const name = formData.get("name") as string
    if (!name || name.trim() === "") {
      throw new Error("Name is required")
    }

    const type = formData.get("type") as string
    const amount = Number.parseFloat(formData.get("amount") as string)
    if (isNaN(amount) || amount < 0) {
      throw new Error("Amount must be a valid positive number")
    }

    const frequency = formData.get("frequency") as string
    const currency = (formData.get("currency") as string) || "USD"
    const startDate = (formData.get("start_date") as string) || null
    const endDate = (formData.get("end_date") as string) || null
    const notes = (formData.get("notes") as string) || null
    const isTaxable = formData.get("is_taxable") === "true"

    console.log("Parsed form data:", {
      name, type, amount, frequency, currency, startDate, endDate, notes, isTaxable
    });

    // Validate type against allowed values
    const allowedTypes = ['salary', 'bonus', 'freelance', 'rental', 'investment', 'passive', 'other']
    if (!allowedTypes.includes(type)) {
      throw new Error(`Invalid income type. Allowed types are: ${allowedTypes.join(', ')}`)
    }

    // Validate frequency against allowed values
    const allowedFrequencies = ['monthly', 'weekly', 'bi-weekly', 'annually', 'one-time']
    if (!allowedFrequencies.includes(frequency)) {
      throw new Error(`Invalid frequency. Allowed frequencies are: ${allowedFrequencies.join(', ')}`)
    }
    
    // First, check if the income source exists
    console.log("Fetching existing income source with ID:", id);
    const { data: existingSources, error: fetchError } = await supabase
      .from("income_sources")
      .select("*")
      .eq("id", id)
      
    if (fetchError) {
      console.error("Error fetching income source:", fetchError)
      throw new Error("Database error while checking income source")
    }
    
    // If the source doesn't exist, create a new one
    if (!existingSources || existingSources.length === 0) {
      console.log("Income source not found, creating a new one:", id)
      
      // Create a new income source object - only include fields known to exist in the schema
      const newIncomeSource = {
        id,
        user_id: userId,
        name,
        type,
        amount,
        frequency,
        currency,
        start_date: startDate,
        end_date: endDate,
        notes,
        is_active: true,
        is_taxable: isTaxable
        // No updated_at field
      }
      
      console.log("Creating new income source:", newIncomeSource);
      
      // Insert the new income source using standard Supabase insert
      const { data: insertedData, error: insertError } = await supabase
        .from("income_sources")
        .insert(newIncomeSource)
        .select()
      
      if (insertError) {
        console.error("Error creating income source:", insertError)
        throw new Error("Failed to create income source: " + insertError.message)
      }
      
      // Force revalidation of relevant paths
      revalidatePath("/income")
      revalidatePath(`/income/sources`)
      revalidatePath(`/income/sources/${id}`)
      
      return { 
        id, 
        created: true,
        source: insertedData?.[0] || newIncomeSource
      }
    }
    
    // Get the existing source
    const existingSource = existingSources[0]
    console.log("Existing income source found:", existingSource);
    
    const originalUserId = existingSource.user_id
    
    // Check if user has permission to edit
    if (originalUserId !== userId) {
      const demoUserId = "00000000-0000-0000-0000-000000000000"
      
      if (originalUserId !== demoUserId) {
        console.error("Access denied for income source:", id, "Current user:", userId, "Source owner:", originalUserId)
        throw new Error("Access denied for this income source")
      }
    }
    
    // Let's try a completely different approach - create a new record and delete the old one
    console.log("Using create-and-replace approach to update income source with amount:", amount);
    
    try {
      // Create a new income source with the updated values
      const newSource = {
        id: uuidv4(), // Generate a new ID
        user_id: userId,
        name,
        type,
        amount,
        frequency,
        currency,
        is_taxable: isTaxable,
        start_date: startDate,
        end_date: endDate,
        notes,
        is_active: existingSource.is_active
      };
      
      console.log("Creating new income source with updated values:", newSource);
      
      // Insert the new record
      const { data: insertedData, error: insertError } = await supabase
        .from("income_sources")
        .insert(newSource)
        .select();
      
      if (insertError) {
        console.error("Error creating new income source:", insertError);
        throw new Error(`Failed to create new income source: ${insertError.message}`);
      }
      
      console.log("Successfully created new income source:", insertedData);
      
      // Delete the old record
      const { error: deleteError } = await supabase
        .from("income_sources")
        .delete()
        .eq("id", id);
      
      if (deleteError) {
        console.error("Error deleting old income source:", deleteError);
        // Continue anyway since we have the new record
      } else {
        console.log("Successfully deleted old income source");
      }
      
      // Return the ID of the new record for redirects
      id = newSource.id;
    } catch (replaceError) {
      console.error("Error in create-and-replace approach:", replaceError);
      throw new Error(`Failed to update income source: ${replaceError instanceof Error ? replaceError.message : 'Unknown error'}`);
    }
    
    // Fetch the updated income source
    const { data: initialUpdatedSource, error: fetchUpdatedError } = await supabase
      .from("income_sources")
      .select("*")
      .eq("id", id)
      .single();
    
    if (fetchUpdatedError) {
      console.error("Error fetching updated source:", fetchUpdatedError);
      throw new Error("Failed to retrieve the updated income source")
    }
    
    // Use a mutable variable to store the final result
    let finalSource = initialUpdatedSource;
    
    console.log("Successfully updated income source:", finalSource);
    
    // Force revalidation of all relevant paths
    revalidatePath("/income", "layout")
    revalidatePath("/income/sources", "layout")
    revalidatePath(`/income/sources/${id}`, "layout")
    revalidatePath(`/income/sources/${id}/edit`, "layout")
    revalidatePath("/", "layout") // Revalidate root for any dashboard components
    
    // Add a small delay to ensure the database has time to update
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Fetch the updated income source again after the delay
    const { data: finalUpdatedSource, error: finalFetchError } = await supabase
      .from("income_sources")
      .select("*")
      .eq("id", id)
      .single();
    
    if (finalFetchError) {
      console.error("Error fetching final updated source:", finalFetchError);
      // Continue with the previous result
    } else if (finalUpdatedSource) {
      console.log("Final updated income source:", finalUpdatedSource);
      finalSource = finalUpdatedSource;
    }
    
    return { 
      id, 
      success: true,
      source: finalSource
    }
  } catch (error) {
    console.error("Unexpected error in updateIncomeSource:", error)
    if (error instanceof Error) {
      throw new Error(`Failed to update income source: ${error.message}`)
    }
    throw new Error("Failed to update income source")
  }
}

// Compatibility layer for deleteIncomeSource
export async function deleteIncomeSource(id: string) {
  try {
    // Use the new function
    await deleteIncome(id);
    
    return { success: true };
  } catch (error) {
    console.error("Error in deleteIncomeSource:", error);
    throw error;
  }
}

// Compatibility layer for calculateIncomeDiversification
export async function calculateIncomeDiversification() {
  try {
    console.log("Calling new income diversification calculation")
    
    // Call the new implementation
    const rawScore = await getIncomeDiversificationScore()
    console.log("Raw diversification score from new implementation:", rawScore)
    
    // Get the income data to build the breakdown
    const incomes = await getIncomes()
    console.log(`Retrieved ${incomes.length} income sources for diversification breakdown`)
    
    if (!incomes || incomes.length === 0) {
      console.log("No income sources found, returning zero scores")
      return {
        overall_score: 0,
        source_count: 0,
        primary_dependency: 0,
        stability_score: 0,
        growth_potential: 0,
        breakdown: [],
      }
    }

    // Calculate total income using monthly_equivalent_amount
    const totalIncome = incomes.reduce((sum, income) => {
      return sum + (income.monthly_equivalent_amount || 0)
    }, 0)
    
    console.log("Total monthly income calculated:", totalIncome)
    
    // If total income is zero, return zero scores
    if (totalIncome <= 0) {
      console.log("Total income is zero or negative, returning zero scores")
      return {
        overall_score: 0,
        source_count: incomes.length,
        primary_dependency: 0,
        stability_score: 0,
        growth_potential: 0,
        breakdown: [],
      }
    }

    // Calculate breakdown and scores
    const breakdown = incomes.map((income) => {
      // Use the monthly_equivalent_amount that already accounts for deductions and side hustles
      const monthlyAmount = income.monthly_equivalent_amount || 0
      const percentage = totalIncome > 0 ? (monthlyAmount / totalIncome) * 100 : 0
      const scoreContribution = Math.round(percentage * 0.8) // Weight the score contribution
      
      return {
        source_id: income.id,
        source_name: income.source_name,
        amount: monthlyAmount,
        percentage: percentage,
        score_contribution: scoreContribution,
      }
    })
    
    // Filter out zero-amount entries
    const validBreakdown = breakdown.filter((item: any) => item.amount > 0)
    
    // Sort breakdown by percentage (highest first)
    validBreakdown.sort((a: any, b: any) => b.percentage - a.percentage)
    
    console.log("Income breakdown calculated:", validBreakdown)
    
    // Calculate primary dependency (percentage of highest income source)
    const primaryDependency = validBreakdown.length > 0 ? validBreakdown[0].percentage : 0
    console.log("Primary dependency calculated:", primaryDependency)
    
    // Calculate stability score based on income categories
    const stabilityScore = Math.min(
      Math.round(
        incomes.reduce((score, income) => {
          // Get category name
          const categoryName = income.category?.name?.toLowerCase() || ''
          
          // Assign stability weights based on income category
          let stabilityWeight = 0.5 // Default
          if (categoryName.includes('salary')) stabilityWeight = 1.0
          else if (categoryName.includes('business')) stabilityWeight = 0.8
          else if (categoryName.includes('investment')) stabilityWeight = 0.7
          else if (categoryName.includes('freelance')) stabilityWeight = 0.4
          
          // Weight by the proportion of total income
          const proportion = income.monthly_equivalent_amount / totalIncome
          return score + stabilityWeight * proportion * 100
        }, 0)
      ),
      100
    )
    
    // Calculate growth potential
    const growthPotential = Math.min(
      Math.round(
        incomes.reduce((score, income) => {
          // Get category name
          const categoryName = income.category?.name?.toLowerCase() || ''
          
          // Assign growth weights based on income category
          let growthWeight = 0.5 // Default
          if (categoryName.includes('business')) growthWeight = 0.9
          else if (categoryName.includes('investment')) growthWeight = 0.8
          else if (categoryName.includes('freelance')) growthWeight = 0.7
          else if (categoryName.includes('salary')) growthWeight = 0.4
          
          // Weight by the proportion of total income
          const proportion = income.monthly_equivalent_amount / totalIncome
          return score + growthWeight * proportion * 100
        }, 0)
      ),
      100
    )
    
    // Calculate overall diversification score using our raw score from the new implementation
    // but adjust it based on the UI's expected factors
    const diversificationFactor = Math.max(0, 100 - primaryDependency)
    const sourceCountFactor = Math.min(incomes.length * 10, 30) // Up to 30 points for number of sources
    
    // Overall score is a weighted combination of factors, but we'll use the raw score as a base
    let overallScore = rawScore
    
    // If raw score seems off, calculate a fallback score
    if (isNaN(overallScore) || overallScore < 0 || overallScore > 100) {
      console.log("Raw score is invalid, calculating fallback score")
      overallScore = Math.round(
        diversificationFactor * 0.5 + 
        sourceCountFactor * 0.2 + 
        stabilityScore * 0.2 + 
        growthPotential * 0.1
      )
    }
    
    // Return the results in the expected format
    return {
      overall_score: Math.min(Math.max(overallScore, 0), 100), // Ensure score is between 0-100
      source_count: incomes.length,
      primary_dependency: Math.round(primaryDependency),
      stability_score: stabilityScore,
      growth_potential: growthPotential,
      breakdown: validBreakdown,
    }
  } catch (error) {
    console.error("Error in calculateIncomeDiversification compatibility layer:", error)
    
    // Return a default response on error
    return {
      overall_score: 50, // Default middle value
      source_count: 0,
      primary_dependency: 0,
      stability_score: 0,
      growth_potential: 0,
      breakdown: [],
    }
  }
}

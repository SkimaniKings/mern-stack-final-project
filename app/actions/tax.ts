"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

// Get the current user ID from the session
async function getCurrentUserId() {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }
    
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

// Tax Optimization Recommendations
export async function getTaxOptimizationRecommendations() {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const { data, error } = await supabase
      .from("tax_optimization_recommendations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tax optimization recommendations:", error)
      throw new Error("Failed to fetch tax optimization recommendations")
    }

    return data || []
  } catch (error) {
    console.error("Error in getTaxOptimizationRecommendations:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      throw error
    }
    return []
  }
}

export async function addTaxOptimizationRecommendation(formData: FormData) {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const recommendationType = formData.get("recommendationType") as string
    const recommendationText = formData.get("recommendationText") as string

    const { error } = await supabase.from("tax_optimization_recommendations").insert({
      id: uuidv4(),
      user_id: userId,
      recommendation_type: recommendationType,
      recommendation_text: recommendationText,
      is_implemented: false,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error adding tax optimization recommendation:", error)
      throw new Error("Failed to add tax optimization recommendation")
    }

    revalidatePath("/tax-planner")
    return { success: true }
  } catch (error) {
    console.error("Error in addTaxOptimizationRecommendation:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function updateTaxOptimizationRecommendation(formData: FormData) {
  try {
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const id = formData.get("id") as string
    const isImplemented = formData.get("isImplemented") === "true"
    const implementedAt = isImplemented ? new Date().toISOString() : null

    const { error } = await supabase
      .from("tax_optimization_recommendations")
      .update({
        is_implemented: isImplemented,
        implemented_at: implementedAt,
      })
      .eq("id", id)

    if (error) {
      console.error("Error updating tax optimization recommendation:", error)
      throw new Error("Failed to update tax optimization recommendation")
    }

    revalidatePath("/tax-planner")
    return { success: true }
  } catch (error) {
    console.error("Error in updateTaxOptimizationRecommendation:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Tax-Advantaged Accounts
export async function getTaxAdvantagedAccounts() {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const { data, error } = await supabase
      .from("tax_advantaged_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tax advantaged accounts:", error)
      throw new Error("Failed to fetch tax advantaged accounts")
    }

    return data || []
  } catch (error) {
    console.error("Error in getTaxAdvantagedAccounts:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      throw error
    }
    return []
  }
}

export async function addTaxAdvantagedAccount(formData: FormData) {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const accountType = formData.get("accountType") as string
    const recommendedContribution = parseFloat(formData.get("recommendedContribution") as string)
    const suggestedTaxImpact = parseFloat(formData.get("suggestedTaxImpact") as string)

    const { error } = await supabase.from("tax_advantaged_accounts").insert({
      id: uuidv4(),
      user_id: userId,
      account_type: accountType,
      recommended_contribution: recommendedContribution,
      suggested_tax_impact: suggestedTaxImpact,
      is_implemented: false,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error adding tax advantaged account:", error)
      throw new Error("Failed to add tax advantaged account")
    }

    revalidatePath("/tax-planner")
    return { success: true }
  } catch (error) {
    console.error("Error in addTaxAdvantagedAccount:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Deduction Finder
export async function getDeductions() {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const { data, error } = await supabase
      .from("deduction_finder")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching deductions:", error)
      throw new Error("Failed to fetch deductions")
    }

    return data || []
  } catch (error) {
    console.error("Error in getDeductions:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      throw error
    }
    return []
  }
}

export async function addDeduction(formData: FormData) {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const expenseCategory = formData.get("expenseCategory") as string
    const potentialDeduction = parseFloat(formData.get("potentialDeduction") as string)

    const { error } = await supabase.from("deduction_finder").insert({
      id: uuidv4(),
      user_id: userId,
      expense_category: expenseCategory,
      potential_deduction: potentialDeduction,
      is_claimed: false,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error adding deduction:", error)
      throw new Error("Failed to add deduction")
    }

    revalidatePath("/tax-planner")
    return { success: true }
  } catch (error) {
    console.error("Error in addDeduction:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Tax Documents
export async function getTaxDocuments() {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const { data, error } = await supabase
      .from("tax_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tax documents:", error)
      throw new Error("Failed to fetch tax documents")
    }

    return data || []
  } catch (error) {
    console.error("Error in getTaxDocuments:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      throw error
    }
    return []
  }
}

export async function addTaxDocument(formData: FormData) {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const documentName = formData.get("documentName") as string
    const documentType = formData.get("documentType") as string
    const documentUrl = formData.get("documentUrl") as string || null

    const { error } = await supabase.from("tax_documents").insert({
      id: uuidv4(),
      user_id: userId,
      document_name: documentName,
      document_type: documentType,
      document_url: documentUrl,
      is_uploaded: !!documentUrl,
      uploaded_at: documentUrl ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error adding tax document:", error)
      throw new Error("Failed to add tax document")
    }

    revalidatePath("/tax-planner")
    return { success: true }
  } catch (error) {
    console.error("Error in addTaxDocument:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Tax Impact Predictions
export async function getTaxImpactPredictions() {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const { data, error } = await supabase
      .from("tax_impact_predictions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tax impact predictions:", error)
      throw new Error("Failed to fetch tax impact predictions")
    }

    return data || []
  } catch (error) {
    console.error("Error in getTaxImpactPredictions:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      throw error
    }
    return []
  }
}

export async function addTaxImpactPrediction(formData: FormData) {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const financialDecision = formData.get("financialDecision") as string
    const estimatedTaxImpact = parseFloat(formData.get("estimatedTaxImpact") as string)
    const predictionDate = formData.get("predictionDate") as string || new Date().toISOString()

    const { error } = await supabase.from("tax_impact_predictions").insert({
      id: uuidv4(),
      user_id: userId,
      financial_decision: financialDecision,
      estimated_tax_impact: estimatedTaxImpact,
      prediction_date: predictionDate,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error adding tax impact prediction:", error)
      throw new Error("Failed to add tax impact prediction")
    }

    revalidatePath("/tax-planner")
    return { success: true }
  } catch (error) {
    console.error("Error in addTaxImpactPrediction:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Tax Filing Tracker
export async function getTaxFilingTrackers() {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const { data, error } = await supabase
      .from("tax_filing_tracker")
      .select("*")
      .eq("user_id", userId)
      .order("filing_year", { ascending: false })

    if (error) {
      console.error("Error fetching tax filing trackers:", error)
      throw new Error("Failed to fetch tax filing trackers")
    }

    return data || []
  } catch (error) {
    console.error("Error in getTaxFilingTrackers:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      throw error
    }
    return []
  }
}

export async function addTaxFilingTracker(formData: FormData) {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const filingYear = parseInt(formData.get("filingYear") as string)
    const filingStatus = formData.get("filingStatus") as string

    const { error } = await supabase.from("tax_filing_tracker").insert({
      id: uuidv4(),
      user_id: userId,
      filing_year: filingYear,
      filing_status: filingStatus,
      filed_at: filingStatus === "submitted" ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error adding tax filing tracker:", error)
      throw new Error("Failed to add tax filing tracker")
    }

    revalidatePath("/tax-planner")
    return { success: true }
  } catch (error) {
    console.error("Error in addTaxFilingTracker:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Debt Tax Impact
export async function getDebtTaxImpact() {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const { data, error } = await supabase
      .from("debt_tax_impact")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching debt tax impact:", error)
      throw new Error("Failed to fetch debt tax impact")
    }

    return data || []
  } catch (error) {
    console.error("Error in getDebtTaxImpact:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      throw error
    }
    return []
  }
}

export async function addDebtTaxImpact(formData: FormData) {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const debtType = formData.get("debtType") as string
    const interestPaid = parseFloat(formData.get("interestPaid") as string)
    const potentialTaxDeduction = parseFloat(formData.get("potentialTaxDeduction") as string)

    const { error } = await supabase.from("debt_tax_impact").insert({
      id: uuidv4(),
      user_id: userId,
      debt_type: debtType,
      interest_paid: interestPaid,
      potential_tax_deduction: potentialTaxDeduction,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error adding debt tax impact:", error)
      throw new Error("Failed to add debt tax impact")
    }

    revalidatePath("/tax-planner")
    return { success: true }
  } catch (error) {
    console.error("Error in addDebtTaxImpact:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Income Tax Impact
export async function getIncomeTaxImpact() {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const { data, error } = await supabase
      .from("income_tax_impact")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching income tax impact:", error)
      throw new Error("Failed to fetch income tax impact")
    }

    return data || []
  } catch (error) {
    console.error("Error in getIncomeTaxImpact:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      throw error
    }
    return []
  }
}

export async function addIncomeTaxImpact(formData: FormData) {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    const incomeType = formData.get("incomeType") as string
    const incomeAmount = parseFloat(formData.get("incomeAmount") as string)
    const estimatedTaxImpact = parseFloat(formData.get("estimatedTaxImpact") as string)

    const { error } = await supabase.from("income_tax_impact").insert({
      id: uuidv4(),
      user_id: userId,
      income_type: incomeType,
      income_amount: incomeAmount,
      estimated_tax_impact: estimatedTaxImpact,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error adding income tax impact:", error)
      throw new Error("Failed to add income tax impact")
    }

    revalidatePath("/tax-planner")
    return { success: true }
  } catch (error) {
    console.error("Error in addIncomeTaxImpact:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Tax Summary Views
export async function getTaxSummary() {
  try {
    const userId = await getCurrentUserId()
    const supabase = await createServerSupabaseClient()
    
    if (!supabase) {
      throw new Error("Failed to create Supabase client")
    }

    // Get debt tax impact summary
    const { data: debtTaxSummary, error: debtError } = await supabase
      .from("debt_tax_impact_summary")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (debtError && debtError.code !== "PGRST116") {
      console.error("Error fetching debt tax summary:", debtError)
    }

    // Get income tax impact summary
    const { data: incomeTaxSummary, error: incomeError } = await supabase
      .from("income_tax_impact_summary")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (incomeError && incomeError.code !== "PGRST116") {
      console.error("Error fetching income tax summary:", incomeError)
    }

    // Get total tax optimization summary
    const { data: taxOptimizationSummary, error: optimizationError } = await supabase
      .from("total_tax_optimization_summary")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (optimizationError && optimizationError.code !== "PGRST116") {
      console.error("Error fetching tax optimization summary:", optimizationError)
    }

    return {
      debtTaxSummary: debtTaxSummary || { 
        total_interest_paid: 0, 
        total_tax_deduction: 0 
      },
      incomeTaxSummary: incomeTaxSummary || { 
        total_income: 0, 
        total_tax_impact: 0 
      },
      taxOptimizationSummary: taxOptimizationSummary || { 
        debt_tax_savings: 0, 
        income_tax_savings: 0, 
        total_tax_savings: 0 
      }
    }
  } catch (error) {
    console.error("Error in getTaxSummary:", error)
    if (error instanceof Error && error.message === "Authentication required") {
      throw error
    }
    return {
      debtTaxSummary: { total_interest_paid: 0, total_tax_deduction: 0 },
      incomeTaxSummary: { total_income: 0, total_tax_impact: 0 },
      taxOptimizationSummary: { debt_tax_savings: 0, income_tax_savings: 0, total_tax_savings: 0 }
    }
  }
}

"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export interface CategoryTrainingData {
  id: string
  user_id: string
  transaction_text: string
  category_id: string
  source_type: 'expense' | 'income' | 'goal' | 'bill' | 'investment'
  created_at: string
}

export interface CategorySuggestion {
  id: string
  user_id: string
  transaction_id: string
  transaction_type: 'expense' | 'income' | 'goal' | 'bill' | 'investment'
  suggested_category_id: string
  confidence_score?: number
  approved?: boolean
  approved_at?: string
  created_at: string
}

// Add training data when a user categorizes a transaction
export async function addCategoryTrainingData(
  transactionText: string,
  categoryId: string,
  sourceType: 'expense' | 'income' | 'goal' | 'bill' | 'investment'
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user || !supabase) {
      return false
    }

    // Add to training data
    const { error } = await supabase
      .from("category_training_data")
      .insert({
        user_id: user.id,
        transaction_text: transactionText,
        category_id: categoryId,
        source_type: sourceType,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error("Error adding category training data:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in addCategoryTrainingData:", error)
    return false
  }
}

// Get category suggestions for a transaction
export async function getCategorySuggestions(
  transactionId: string,
  transactionType: 'expense' | 'income' | 'goal' | 'bill' | 'investment'
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user || !supabase) {
      return { suggestions: [] }
    }

    const { data, error } = await supabase
      .from("category_suggestions")
      .select("*, category:suggested_category_id(id, name, color, icon)")
      .eq("user_id", user.id)
      .eq("transaction_id", transactionId)
      .eq("transaction_type", transactionType)
      .order("confidence_score", { ascending: false })

    if (error) {
      console.error("Error fetching category suggestions:", error)
      return { suggestions: [] }
    }

    return { suggestions: data }
  } catch (error) {
    console.error("Error in getCategorySuggestions:", error)
    return { suggestions: [] }
  }
}

// Create a category suggestion
export async function createCategorySuggestion(
  transactionId: string,
  transactionType: 'expense' | 'income' | 'goal' | 'bill' | 'investment',
  categoryId: string,
  confidenceScore?: number
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user || !supabase) {
      return null
    }

    // Create suggestion
    const { data, error } = await supabase
      .from("category_suggestions")
      .insert({
        user_id: user.id,
        transaction_id: transactionId,
        transaction_type: transactionType,
        suggested_category_id: categoryId,
        confidence_score: confidenceScore || null,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error("Error creating category suggestion:", error)
      return null
    }

    return data[0]
  } catch (error) {
    console.error("Error in createCategorySuggestion:", error)
    return null
  }
}

// Approve or reject a category suggestion
export async function respondToCategorySuggestion(
  suggestionId: string,
  approved: boolean
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user || !supabase) {
      return false
    }

    // Get the suggestion to verify it belongs to the user
    const { data: suggestion, error: suggestionError } = await supabase
      .from("category_suggestions")
      .select("user_id, transaction_id, transaction_type, suggested_category_id")
      .eq("id", suggestionId)
      .single()

    if (suggestionError) {
      console.error("Error fetching suggestion:", suggestionError)
      return false
    }

    if (!suggestion || suggestion.user_id !== user.id) {
      return false
    }

    // Update the suggestion
    const { error: updateError } = await supabase
      .from("category_suggestions")
      .update({
        approved,
        approved_at: new Date().toISOString()
      })
      .eq("id", suggestionId)

    if (updateError) {
      console.error("Error updating suggestion:", updateError)
      return false
    }

    // If approved, update the transaction with the suggested category
    if (approved) {
      let tableToUpdate = '';
      switch (suggestion.transaction_type) {
        case 'expense':
          tableToUpdate = 'expenses';
          break;
        case 'income':
          tableToUpdate = 'incomes';
          break;
        case 'goal':
          tableToUpdate = 'financial_goals';
          break;
        case 'bill':
          tableToUpdate = 'bills';
          break;
        case 'investment':
          tableToUpdate = 'investments';
          break;
      }

      const { error: transactionError } = await supabase
        .from(tableToUpdate)
        .update({
          category_id: suggestion.suggested_category_id
        })
        .eq("id", suggestion.transaction_id)
        .eq("user_id", user.id)

      if (transactionError) {
        console.error("Error updating transaction category:", transactionError)
        // We still return true since the suggestion was updated successfully
      }

      // Revalidate paths
      revalidatePath("/transactions")
      revalidatePath("/categories")
      revalidatePath(`/${suggestion.transaction_type}s`)
    }

    return true
  } catch (error) {
    console.error("Error in respondToCategorySuggestion:", error)
    return false
  }
}

// Generate category suggestions for a transaction based on training data
export async function generateCategorySuggestions(
  transactionId: string,
  transactionType: 'expense' | 'income' | 'goal' | 'bill' | 'investment',
  transactionText: string
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user || !supabase || !transactionText) {
      return []
    }

    // Get training data for this user
    const { data: trainingData, error: trainingError } = await supabase
      .from("category_training_data")
      .select("transaction_text, category_id, source_type")
      .eq("user_id", user.id)

    if (trainingError || !trainingData || trainingData.length === 0) {
      return []
    }

    // Simple text similarity algorithm
    // In a real app, this would be more sophisticated, possibly using ML
    const suggestions: { categoryId: string; score: number }[] = [];
    const transactionTextLower = transactionText.toLowerCase();
    
    // Count occurrences of each category in similar transactions
    const categoryScores = new Map<string, number>();
    
    trainingData.forEach(item => {
      const itemTextLower = item.transaction_text.toLowerCase();
      
      // Calculate simple similarity score (0-1)
      // Check if transaction text contains training text or vice versa
      let similarity = 0;
      if (transactionTextLower.includes(itemTextLower) || itemTextLower.includes(transactionTextLower)) {
        // Calculate Jaccard similarity (intersection over union of words)
        const transWords = new Set(transactionTextLower.split(/\s+/));
        const itemWords = new Set(itemTextLower.split(/\s+/));
        
        // Calculate intersection
        const intersection = new Set([...transWords].filter(x => itemWords.has(x)));
        
        // Calculate union
        const union = new Set([...transWords, ...itemWords]);
        
        similarity = intersection.size / union.size;
      }
      
      // Only consider items with some similarity
      if (similarity > 0.1) {
        // Weight by source type match
        const sourceTypeMatch = item.source_type === transactionType ? 1.2 : 1.0;
        const score = similarity * sourceTypeMatch;
        
        // Add to category scores
        const currentScore = categoryScores.get(item.category_id) || 0;
        categoryScores.set(item.category_id, currentScore + score);
      }
    });
    
    // Convert to array and sort by score
    for (const [categoryId, score] of categoryScores.entries()) {
      suggestions.push({ categoryId, score });
    }
    
    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score);
    
    // Take top 3 suggestions
    const topSuggestions = suggestions.slice(0, 3);
    
    // Create suggestions in the database
    const createdSuggestions = [];
    for (const suggestion of topSuggestions) {
      const result = await createCategorySuggestion(
        transactionId,
        transactionType,
        suggestion.categoryId,
        suggestion.score
      );
      if (result) {
        createdSuggestions.push(result);
      }
    }
    
    return createdSuggestions;
  } catch (error) {
    console.error("Error in generateCategorySuggestions:", error);
    return [];
  }
}

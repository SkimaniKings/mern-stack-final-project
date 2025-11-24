"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"

// Interface for voice memo data
export interface VoiceMemoData {
  expense_id: string
  audio_url?: string
  transcript?: string
}

// Get voice memo by expense ID
export async function getVoiceMemoByExpenseId(expenseId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // First check if the expense belongs to the user
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", expenseId)
      .eq("user_id", user.id)
      .single()

    if (expenseError || !expense) {
      throw new Error("Expense not found or access denied")
    }

    const { data, error } = await supabase
      .from("voice_memos")
      .select("*")
      .eq("expense_id", expenseId)
      .single()

    if (error && error.code !== "PGRST116") { // PGRST116 is "no rows returned"
      console.error("Error fetching voice memo:", error)
      throw new Error("Failed to fetch voice memo")
    }

    return data || null
  } catch (error) {
    console.error("Error in getVoiceMemoByExpenseId:", error)
    throw error
  }
}

// Create or update voice memo
export async function saveVoiceMemo(memoData: VoiceMemoData) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // First check if the expense belongs to the user
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", memoData.expense_id)
      .eq("user_id", user.id)
      .single()

    if (expenseError || !expense) {
      throw new Error("Expense not found or access denied")
    }

    // Check if voice memo already exists
    const { data: existingMemo } = await supabase
      .from("voice_memos")
      .select("id")
      .eq("expense_id", memoData.expense_id)
      .single()

    let result
    
    if (existingMemo) {
      // Update existing memo
      const { data, error } = await supabase
        .from("voice_memos")
        .update({
          audio_url: memoData.audio_url,
          transcript: memoData.transcript
        })
        .eq("id", existingMemo.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating voice memo:", error)
        throw new Error("Failed to update voice memo")
      }

      result = data
    } else {
      // Create new memo
      const { data, error } = await supabase
        .from("voice_memos")
        .insert({
          expense_id: memoData.expense_id,
          audio_url: memoData.audio_url,
          transcript: memoData.transcript
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating voice memo:", error)
        throw new Error("Failed to create voice memo")
      }

      result = data
    }

    // Revalidate the expenses path to update UI
    revalidatePath("/expenses")
    
    return result
  } catch (error) {
    console.error("Error in saveVoiceMemo:", error)
    throw error
  }
}

// Delete voice memo
export async function deleteVoiceMemo(memoId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    // First check if the memo belongs to the user's expense
    const { data: memo, error: memoError } = await supabase
      .from("voice_memos")
      .select("expense_id")
      .eq("id", memoId)
      .single()

    if (memoError || !memo) {
      throw new Error("Voice memo not found")
    }

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", memo.expense_id)
      .eq("user_id", user.id)
      .single()

    if (expenseError || !expense) {
      throw new Error("Access denied")
    }

    // Delete memo
    const { error } = await supabase
      .from("voice_memos")
      .delete()
      .eq("id", memoId)

    if (error) {
      console.error("Error deleting voice memo:", error)
      throw new Error("Failed to delete voice memo")
    }

    // Revalidate the expenses path to update UI
    revalidatePath("/expenses")
    
    return { success: true }
  } catch (error) {
    console.error("Error in deleteVoiceMemo:", error)
    throw error
  }
}

// Process voice memo with transcription using a third-party service
export async function transcribeVoiceMemo(audioUrl: string) {
  try {
    if (!audioUrl) {
      throw new Error("Audio URL is required for transcription")
    }

    // Check if we have the OpenAI API key in environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error("OpenAI API key not found in environment variables")
      throw new Error("Transcription service configuration is missing")
    }

    // Fetch the audio file
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio file: ${audioResponse.statusText}`)
    }

    const audioBlob = await audioResponse.blob()
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.mp3')
    formData.append('model', 'whisper-1')

    // Call OpenAI's Whisper API for transcription
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Transcription API error:", errorData)
      throw new Error(`Transcription service error: ${response.statusText}`)
    }

    const result = await response.json()
    return result.text
  } catch (error) {
    console.error("Error in transcribeVoiceMemo:", error)
    throw error instanceof Error ? error : new Error(String(error))
  }
}

// Get all voice memos for a user
export async function getAllVoiceMemos() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }

    const { data, error } = await supabase
      .from("voice_memos")
      .select(`
        *,
        expenses!inner(id, user_id, merchant_name, amount, category, description, spent_at)
      `)
      .eq("expenses.user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching voice memos:", error)
      throw new Error("Failed to fetch voice memos")
    }

    return data || []
  } catch (error) {
    console.error("Error in getAllVoiceMemos:", error)
    throw error
  }
}

// Search voice memos by transcript content
export async function searchVoiceMemosByTranscript(searchQuery: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getAuthenticatedUser()

    if (!user) {
      throw new Error("Authentication required")
    }
    
    const { data, error } = await supabase
      .from("voice_memos")
      .select(`
        *,
        expenses!inner(id, user_id, merchant_name, amount, category, description, spent_at)
      `)
      .ilike("transcript", `%${searchQuery}%`)
      .eq("expenses.user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error searching voice memos:", error)
      throw new Error("Failed to search voice memos")
    }

    return data || []
  } catch (error) {
    console.error("Error in searchVoiceMemosByTranscript:", error)
    throw error
  }
}

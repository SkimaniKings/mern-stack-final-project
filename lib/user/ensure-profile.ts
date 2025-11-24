"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * Ensures that a user profile exists in the profiles table
 * This is needed because some tables reference profiles(id) while others reference auth.users(id)
 * @param userId The user ID to check/create a profile for
 * @returns true if the profile exists or was created, false otherwise
 */
export async function ensureUserProfile(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    console.error("No user ID provided to ensureUserProfile")
    return { success: false, error: "No user ID provided" }
  }

  try {
    if (!userId) {
      return { 
        success: false, 
        error: "No user ID provided" 
      }
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return { success: false, error: "Database connection failed" }
    }

    // Check if the user is authenticated using the secure getUser method
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      return { 
        success: false, 
        error: userError?.message || "No authenticated user found" 
      }
    }

    // Verify that the provided userId matches the authenticated user
    if (userData.user.id !== userId) {
      console.error(`User ID mismatch: provided ${userId} but authenticated as ${userData.user.id}`)
      return { 
        success: false, 
        error: `User ID mismatch: provided ${userId} but authenticated as ${userData.user.id}` 
      }
    }
    
    // Log the authenticated user ID for debugging
    console.log("Authenticated user ID:", userData.user.id)

    // Check if the user has a profile in the profiles table
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()
    
    // If profile exists, return true
    if (profileData) {
      console.log("User profile exists:", profileData.id)
      return { success: true }
    }
    
    // If error is not "not found", log it
    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error checking for user profile:", profileError)
      return { 
        success: false, 
        error: `Error checking for user profile: ${profileError.message}` 
      }
    }

    // No profile exists, create one
    console.log("No profile found for user, creating one...")
    
    // Create a profile for the user - CRITICAL: id must match auth.users(id)
    console.log("Creating profile with ID:", userId, "to match auth user ID:", userData.user.id)
    const { error: createProfileError } = await supabase
      .from("profiles")
      .insert({
        id: userId, // This MUST match the auth.users(id) due to foreign key constraint
        first_name: userData.user.user_metadata?.first_name || "User",
        last_name: userData.user.user_metadata?.last_name || userData.user.email?.split("@")[0] || "User",
        email: userData.user.email || "",
        avatar_url: userData.user.user_metadata?.avatar_url || null
      })
    
    if (createProfileError) {
      console.error("Error creating user profile:", createProfileError)
      return { 
        success: false, 
        error: `Failed to create user profile: ${createProfileError.message}` 
      }
    }
    
    console.log("Created new profile for user:", userId)
    
    // Explicitly verify that the profile was created successfully
    // This ensures the transaction was committed before proceeding
    const { data: verifyProfile, error: verifyError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()
    
    if (verifyError || !verifyProfile) {
      console.error("Failed to verify profile creation:", verifyError || "No profile found after creation")
      return {
        success: false,
        error: `Profile creation could not be verified: ${verifyError?.message || "Profile not found after creation"}`
      }
    }
    
    console.log("Verified profile exists for user:", verifyProfile.id)
    return { success: true }
  } catch (error) {
    console.error("Unexpected error in ensureUserProfile:", error)
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` }
  }
}

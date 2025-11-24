import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getClientSupabaseClient } from "@/lib/supabase/client";
import { UserAttributes, UserProfile, UserSettings } from "@/lib/types/user";
import { cache } from "react";

// Server-side user operations
export const getUserProfile = cache(async (userId: string): Promise<UserProfile | null> => {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      console.error("Failed to create Supabase client");
      return null;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        email,
        avatar_url,
        user_role,
        theme,
        currency_code,
        timezone,
        onboarding_completed
      `)
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching user profile:", error.message);
      return null;
    }
    
    return data as UserProfile;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
});

export const getUserSettings = cache(async (userId: string): Promise<UserSettings | null> => {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      console.error("Failed to create Supabase client");
      return null;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        theme,
        currency_code,
        timezone,
        date_format,
        notification_preferences,
        privacy_level,
        local_data_only,
        allow_data_analysis,
        session_timeout_minutes
      `)
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching user settings:", error.message);
      return null;
    }
    
    return data as UserSettings;
  } catch (error) {
    console.error("Error in getUserSettings:", error);
    return null;
  }
});

// Client-side user operations
export const updateUserProfile = async (userId: string, profile: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = getClientSupabaseClient();
    if (!supabase) {
      return { success: false, error: "Failed to get Supabase client" };
    }
    
    const { error } = await supabase
      .from('users')
      .update(profile)
      .eq('id', userId);
    
    if (error) {
      console.error("Error updating user profile:", error.message);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const updateUserSettings = async (userId: string, settings: Partial<UserSettings>): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = getClientSupabaseClient();
    if (!supabase) {
      return { success: false, error: "Failed to get Supabase client" };
    }
    
    const { error } = await supabase
      .from('users')
      .update(settings)
      .eq('id', userId);
    
    if (error) {
      console.error("Error updating user settings:", error.message);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error in updateUserSettings:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const createUserRecord = async (userId: string, username: string, email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      console.error("[Server] Failed to create Supabase client");
      return { success: false, error: "Failed to create Supabase client" };
    }

    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        username,
        email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("[Server] Error creating user record:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("[Server] Error in createUserRecord:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
};

export const updateLastLoginTimestamp = async (userId: string): Promise<void> => {
  try {
    const supabase = getClientSupabaseClient();
    if (!supabase) {
      console.error("Failed to get Supabase client");
      return;
    }
    
    const { error } = await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error("Error updating last login timestamp:", error.message);
    }
  } catch (error) {
    console.error("Error in updateLastLoginTimestamp:", error);
  }
};

export const updateLastActiveTimestamp = async (userId: string): Promise<void> => {
  try {
    const supabase = getClientSupabaseClient();
    if (!supabase) {
      console.error("Failed to get Supabase client");
      return;
    }
    
    const { error } = await supabase
      .from('users')
      .update({
        last_active_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error("Error updating last active timestamp:", error.message);
    }
  } catch (error) {
    console.error("Error in updateLastActiveTimestamp:", error);
  }
};

export const ensureUserExists = async (userId: string, email: string): Promise<boolean> => {
  try {
    // Use server-side Supabase client
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      console.error("[Server] Failed to create Supabase client");
      return false;
    }
    
    // Rest of the function remains the same
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("[Server] Error checking if user exists:", error.message);
      return false;
    }
    
    if (!data) {
      const emailPrefix = email.split('@')[0];
      const username = `${emailPrefix}${Math.floor(Math.random() * 1000)}`;
      
      const result = await createUserRecord(userId, username, email);
      return result.success;
    }
    
    return true;
  } catch (error) {
    console.error("[Server] Error in ensureUserExists:", error);
    return false;
  }
};

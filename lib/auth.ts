import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server-utils"
import { getClientSupabaseClient } from "./supabase/client"
import { ensureUserExists } from "./services/user-service"
import { cache } from "react"
import { getAuthenticatedUser as getClientAuthUser } from "./supabase/client-auth"
import type { User } from "@supabase/supabase-js"

/**
 * Get the authenticated user, either from the client or server
 * Uses getUser() for secure authentication with fallback to getSession()
 */
export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  try {
    // On the client side, use the client auth utilities
    if (typeof window !== 'undefined') {
      return getClientAuthUser()
    }

    // Server-side authentication
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      console.error("Failed to create Supabase client")
      return null
    }
    
    try {
      // First try to get the user (most secure method)
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData?.user) {
        console.warn('Error getting user, falling back to session:', userError?.message)
        // Fall back to getSession for backward compatibility
        const { data: sessionData } = await supabase.auth.getSession()
        return sessionData?.session?.user || null
      }

      // If we have user data, ensure the user exists in our database
      const userId = userData.user.id;
      const userEmail = userData.user.email;
      
      if (!userId || !userEmail) {
        console.error('Missing user ID or email in auth data');
        return null;
      }

      // Ensure the user exists in our database with just the email
      try {
        const ensureResult = await ensureUserExists(userId, userEmail);
        if (!ensureResult) {
          console.error('Error ensuring user exists');
          return null;
        }
      } catch (ensureError) {
        console.error('Error in ensureUserExists:', ensureError);
        return null;
      }

      return userData.user;
    } catch (innerError) {
      console.error('Error in getAuthenticatedUser inner try:', innerError);
      return null;
    }
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    return null;
  }
});

// For backward compatibility
export const getCurrentUser = getAuthenticatedUser;

/**
 * Require authentication for protected routes
 * @param redirectTo The path to redirect to if not authenticated (default: '/login')
 * @returns The authenticated user or null if not authenticated
 */
export async function requireAuth(redirectTo: string = '/login'): Promise<User | null> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    // Using redirect() in a server component or server action
    if (typeof window === 'undefined') {
      redirect(redirectTo);
    } else {
      // Client-side redirect
      window.location.href = redirectTo;
    }
  }
  
  return user;
}

/**
 * Centralized authentication service
 * This provides consistent, robust authentication handling across the application
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Authentication result type
export type AuthResult = {
  user: any | null;
  error: Error | null;
}

/**
 * Create a Supabase client with consistent authentication settings
 */
export function createAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials are not properly configured");
  }
  
  // Create client with enhanced auth configuration
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'supabase.auth.token',
      flowType: 'pkce',
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'x-application-name': 'finance-tracker'
      }
    }
  });
}

/**
 * Get the current authenticated user
 * This tries multiple authentication methods to ensure robust auth flow
 */
export async function getCurrentUser(): Promise<AuthResult> {
  try {
    const supabase = createAuthClient();
    
    // Method 1: Try getUser - most secure, contacts the Supabase Auth server
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userData?.user) {
        return { user: userData.user, error: null };
      }
      
      // If getUser fails, continue trying alternatives
      if (userError) {
        console.log("Auth Service: getUser failed, trying alternatives", userError.message);
      }
      
      // Method 2: Try getSession
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionData?.session?.user) {
        return { user: sessionData.session.user, error: null };
      }
      
      if (sessionError) {
        console.log("Auth Service: getSession failed", sessionError.message);
      }
      
      // Method 3: Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshData?.user) {
        return { user: refreshData.user, error: null };
      }
      
      if (refreshData?.session?.user) {
        return { user: refreshData.session.user, error: null };
      }
      
      // If all methods fail, return null user with appropriate error
      return { 
        user: null, 
        error: new Error("Authentication failed: No valid session found through any method")
      };
      
      // If all authentication methods fail, return null user
      return { 
        user: null, 
        error: new Error("Authentication failed: No valid session found through any method")
      };
    } catch (authError) {
      console.error("Auth Service: Unexpected authentication error", authError);
      return { user: null, error: authError instanceof Error ? authError : new Error(String(authError)) };
    }
  } catch (clientError) {
    console.error("Auth Service: Failed to create Supabase client", clientError);
    return { user: null, error: clientError instanceof Error ? clientError : new Error(String(clientError)) };
  }
}

/**
 * Client-side version of getCurrentUser
 * Has the same robust authentication approach
 */
export async function getCurrentUserClient(): Promise<AuthResult> {
  try {
    // Only run in client context
    if (typeof window === 'undefined') {
      return { user: null, error: new Error("getCurrentUserClient cannot be called from server context") };
    }
    
    const supabase = createAuthClient();
    
    // Try all authentication methods
    try {
      // Method 1: Try getUser
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userData?.user) {
        return { user: userData.user, error: null };
      }
      
      // Method 2: Try getSession
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionData?.session?.user) {
        return { user: sessionData.session.user, error: null };
      }
      
      // Method 3: Try refreshing the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshData?.user) {
        return { user: refreshData.user, error: null };
      }
      
      if (refreshData?.session?.user) {
        return { user: refreshData.session.user, error: null };
      }
      
      // Method 4: Check localStorage directly
      try {
        const storedSession = localStorage.getItem('supabase.auth.token');
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          if (parsedSession?.access_token && parsedSession?.refresh_token) {
            // Setup session with these tokens
            const { data: tokenData, error: tokenError } = await supabase.auth.setSession({
              access_token: parsedSession.access_token,
              refresh_token: parsedSession.refresh_token
            });
            
            if (tokenData?.user) {
              return { user: tokenData.user, error: null };
            }
          }
        }
      } catch (storageError) {
        console.warn("Auth Service: Failed to access localStorage", storageError);
      }
      
      // If all methods fail, return null user with appropriate error
      return { 
        user: null, 
        error: new Error("Client authentication failed: No valid session found through any method")
      };
    } catch (authError) {
      console.error("Auth Service: Unexpected client authentication error", authError);
      return { user: null, error: authError instanceof Error ? authError : new Error(String(authError)) };
    }
  } catch (clientError) {
    console.error("Auth Service: Failed to create client Supabase client", clientError);
    return { user: null, error: clientError instanceof Error ? clientError : new Error(String(clientError)) };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const supabase = createAuthClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { error };
    }
    
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

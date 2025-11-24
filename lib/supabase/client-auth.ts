import { getClientSupabaseClient } from './client';
import { authPersistence } from '../auth/client-persistence';

/**
 * Get the authenticated user on the client side
 * Uses getUser() for secure authentication and falls back to getSession() if needed
 * Also attempts to restore session from localStorage if cookies fail
 */
export async function getAuthenticatedUser() {
  try {
    const supabase = getClientSupabaseClient();
    if (!supabase) {
      console.error('Supabase client not available');
      return null;
    }

    // First try to get the user (most secure method)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.warn('Failed to get user, attempting session restoration:', userError?.message);
      
      // Try to force restore session from localStorage (better for new tabs)
      const restored = await authPersistence.forceSessionCheck();
      if (restored) {
        // Try getting user again after restoration
        const { data: { user: restoredUser } } = await supabase.auth.getUser();
        if (restoredUser) return restoredUser;
      }
      
      // Fall back to getSession if getUser fails
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Store the session for cross-tab persistence
        authPersistence.storeSession(session);
        return session.user;
      }
      
      return null;
    }

    // If we have a user, ensure session is stored for cross-tab sync
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      authPersistence.storeSession(session);
    }

    return user;
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    
    // As a last resort, try to restore from localStorage
    try {
      const restored = await authPersistence.forceSessionCheck();
      if (restored) {
        const supabase = getClientSupabaseClient();
        const { data: { user } } = await supabase!.auth.getUser();
        return user;
      }
    } catch (restoreError) {
      console.error('Failed to restore session:', restoreError);
    }
    
    return null;
  }
}

/**
 * Ensure the user is authenticated
 * Redirects to login if not authenticated
 */
export async function ensureAuthenticated(redirectTo = '/login') {
  const user = await getAuthenticatedUser();
  if (!user) {
    // Clear any stale localStorage data
    authPersistence.clearStoredSession();
    
    // Using window.location for client-side redirect
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
    return false;
  }
  return true;
}

export const authUtils = {
  getAuthenticatedUser,
  ensureAuthenticated,
};

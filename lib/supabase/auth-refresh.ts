import { createServerSupabaseClient } from './server-utils';

/**
 * Refreshes the user's session token if it's expired or about to expire
 * This helps prevent "invalid JWT: token is expired" errors
 */
export async function refreshSession() {
  try {
    const supabase = await createServerSupabaseClient();
    
    if (!supabase) {
      console.error('Failed to create Supabase client for token refresh');
      return null;
    }

    // Use getUser() instead of getSession() for better security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      return null;
    }

    // If no user, nothing to refresh
    if (!user) {
      return null;
    }

    // Get the session after verifying the user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Error getting session:', sessionError);
      return null;
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = session.expires_at;
    const isExpired = expiresAt && (expiresAt * 1000 < Date.now() + 5 * 60 * 1000);
    
    if (isExpired) {
      console.log('Session token is expired or about to expire, refreshing...');
      
      // Refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Error refreshing session:', refreshError);
        return null;
      }
      
      console.log('Session refreshed successfully');
      return refreshedSession;
    }
    
    return session;
  } catch (error) {
    console.error('Unexpected error in refreshSession:', error);
    return null;
  }
}

/**
 * Middleware function to refresh the auth token before making API calls
 * Use this to wrap any function that makes authenticated API calls
 */
export function withAuthRefresh<T extends (...args: any[]) => Promise<any>>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      // Refresh the session first
      await refreshSession();
      
      // Then execute the original function
      return await fn(...args);
    } catch (error) {
      console.error('Error in withAuthRefresh:', error);
      throw error;
    }
  };
}

'use client'

import { useEffect } from 'react'
import { getClientSupabaseClient } from '@/lib/supabase/client'

/**
 * Session Initializer Component
 * Ensures proper session restoration when the app loads, especially for new tabs
 */
export function SessionInitializer() {
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const supabase = getClientSupabaseClient()
        if (!supabase) {
          console.warn('Supabase client not available')
          return
        }

        // Check current session status
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.warn('Error getting session:', error)
          return
        }

        if (session) {
          console.log('Session found on initialization:', session.user.id)
        } else {
          console.log('No session found on initialization, attempting to restore...')
          
          // Try to refresh session in case it exists in storage but not loaded
          try {
            await supabase.auth.refreshSession()
            
            // Check again after refresh attempt
            const { data: { refreshedSession } } = await supabase.auth.getSession()
            if (refreshedSession) {
              console.log('Session successfully restored on new tab:', refreshedSession.user.id)
            } else {
              console.log('No session available to restore')
            }
          } catch (refreshError) {
            console.warn('Error attempting to refresh session:', refreshError)
          }
        }

        // The auth state change listener in the client will handle cross-tab sync
        // No need for additional localStorage management here
        
      } catch (error) {
        console.error('Error initializing session:', error)
      }
    }

    initializeSession()
  }, [])

  // This component doesn't render anything visible
  return null
}

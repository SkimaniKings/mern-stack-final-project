import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./database.types"

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if environment variables are set
if ((!supabaseUrl || !supabaseAnonKey) && typeof window !== 'undefined') {
  console.error('Missing Supabase environment variables')
}

// Create a memoized client to avoid recreating the client on every call
let browserSupabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Enhanced client creation with cross-tab session persistence
 */
export function createClientSupabaseClient() {
  // Only create the client in browser environments
  if (typeof window === 'undefined') {
    return null
  }
  
  // Double check environment variables before creating client
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Cannot create Supabase client: Missing environment variables')
    return null
  }
  
  try {
    // Create a new client if one doesn't exist
    if (!browserSupabaseClient) {
      browserSupabaseClient = createBrowserClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: {
            persistSession: true,
            storage: {
              getItem: (key: string) => {
                if (typeof window === 'undefined') return null
                try {
                  // Try localStorage first, then cookies as fallback
                  const value = localStorage.getItem(key)
                  if (value) return value
                  
                  // Fallback to cookies for cross-tab compatibility
                  const cookies = document.cookie.split(';')
                  for (const cookie of cookies) {
                    const [cookieKey, cookieValue] = cookie.trim().split('=')
                    if (cookieKey === key) {
                      return decodeURIComponent(cookieValue)
                    }
                  }
                  return null
                } catch (error) {
                  console.warn('Error getting auth storage:', error)
                  return null
                }
              },
              setItem: (key: string, value: string) => {
                if (typeof window === 'undefined') return
                try {
                  // Store in both localStorage and cookies for cross-tab persistence
                  localStorage.setItem(key, value)
                  
                  // Set cookie with proper attributes for cross-tab sharing
                  const isProduction = process.env.NODE_ENV === 'production'
                  const cookieOptions = [
                    `${key}=${encodeURIComponent(value)}`,
                    'path=/',
                    'max-age=604800', // 7 days
                    isProduction ? 'secure' : '',
                    isProduction ? 'samesite=none' : 'samesite=lax'
                  ].filter(Boolean).join('; ')
                  
                  document.cookie = cookieOptions
                  
                  // Broadcast session update to other tabs
                  window.dispatchEvent(new StorageEvent('storage', {
                    key: 'supabase_session_update',
                    newValue: JSON.stringify({ timestamp: Date.now(), action: 'session_updated' }),
                    storageArea: localStorage
                  }))
                } catch (error) {
                  console.warn('Error setting auth storage:', error)
                }
              },
              removeItem: (key: string) => {
                if (typeof window === 'undefined') return
                try {
                  localStorage.removeItem(key)
                  // Remove cookie
                  const isProduction = process.env.NODE_ENV === 'production'
                  const cookieOptions = [
                    `${key}=`,
                    'path=/',
                    'max-age=0',
                    isProduction ? 'secure' : '',
                    isProduction ? 'samesite=none' : 'samesite=lax'
                  ].filter(Boolean).join('; ')
                  
                  document.cookie = cookieOptions
                  
                  // Broadcast session removal to other tabs
                  window.dispatchEvent(new StorageEvent('storage', {
                    key: 'supabase_session_update',
                    newValue: JSON.stringify({ timestamp: Date.now(), action: 'session_removed' }),
                    storageArea: localStorage
                  }))
                } catch (error) {
                  console.warn('Error removing auth storage:', error)
                }
              }
            },
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            debug: process.env.NODE_ENV === 'development'
          },
          global: {
            headers: {
              'X-Client-Info': 'supabase-js-cross-tab',
            },
          },
        }
      )
      
      // Add auth state change listener for cross-tab synchronization
      if (browserSupabaseClient) {
        browserSupabaseClient.auth.onAuthStateChange((event, session) => {
          console.log('Auth state changed:', event, session?.user?.id ? 'User logged in' : 'No session')
          
          // Handle cross-tab synchronization without forced refreshes
          if (typeof window !== 'undefined') {
            try {
              const authEvent = {
                type: 'auth_state_change',
                event,
                timestamp: Date.now(),
                hasSession: !!session,
                userId: session?.user?.id || null
              }
              
              // Store the auth event for other tabs to pick up
              localStorage.setItem('supabase_auth_event', JSON.stringify(authEvent))
              
              // Clean up the event after a short delay
              setTimeout(() => {
                try {
                  const currentEvent = localStorage.getItem('supabase_auth_event')
                  if (currentEvent) {
                    const parsed = JSON.parse(currentEvent)
                    if (parsed.timestamp === authEvent.timestamp) {
                      localStorage.removeItem('supabase_auth_event')
                    }
                  }
                } catch (e) {
                  // Ignore cleanup errors
                }
              }, 1000)
            } catch (error) {
              console.warn('Error broadcasting auth state:', error)
            }
          }
        })
        
        // Listen for auth state changes from other tabs
        if (typeof window !== 'undefined') {
          window.addEventListener('storage', async (e) => {
            if (e.key === 'supabase_auth_event' && e.newValue) {
              try {
                const authEvent = JSON.parse(e.newValue)
                console.log('Received auth event from another tab:', authEvent.event)
                
                // Handle sign out from other tabs
                if (authEvent.event === 'SIGNED_OUT') {
                  // Check if we still have a session in this tab
                  const { data: { session } } = await browserSupabaseClient!.auth.getSession()
                  if (session) {
                    // Sign out this tab as well
                    await browserSupabaseClient!.auth.signOut()
                    // Redirect to login
                    window.location.href = '/login'
                  }
                }
                // Handle sign in from other tabs - trigger session refresh
                else if (authEvent.event === 'SIGNED_IN' && authEvent.userId) {
                  // Check if we don't have a session in this tab
                  const { data: { session } } = await browserSupabaseClient!.auth.getSession()
                  if (!session) {
                    // Try to refresh the session to pick up the new auth state
                    await browserSupabaseClient!.auth.refreshSession()
                    
                    // Check again after refresh
                    const { data: { newSession } } = await browserSupabaseClient!.auth.getSession()
                    if (newSession) {
                      console.log('Session restored from other tab login')
                      // Redirect to dashboard if we're on login page
                      if (window.location.pathname === '/login') {
                        window.location.href = '/dashboard'
                      }
                    }
                  }
                }
              } catch (error) {
                console.warn('Error handling auth event from other tab:', error)
              }
            }
            
            // Also listen for direct session updates
            if (e.key === 'supabase_session_update' && e.newValue) {
              try {
                const updateEvent = JSON.parse(e.newValue)
                if (updateEvent.action === 'session_updated') {
                  // Another tab updated the session, refresh ours
                  setTimeout(async () => {
                    try {
                      await browserSupabaseClient!.auth.refreshSession()
                    } catch (error) {
                      console.warn('Error refreshing session after update:', error)
                    }
                  }, 100)
                }
              } catch (error) {
                console.warn('Error handling session update event:', error)
              }
            }
          })
        }
      }
    }
    
    return browserSupabaseClient
  } catch (error) {
    console.error('Error creating Supabase client:', error)
    return null
  }
}

// Get client Supabase instance
export function getClientSupabaseClient() {
  return createClientSupabaseClient()
}

// For direct imports - but only in browser environments
export const supabase = typeof window !== 'undefined' ? getClientSupabaseClient() : null

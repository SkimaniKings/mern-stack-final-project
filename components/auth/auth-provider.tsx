"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { getClientSupabaseClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

// Define the authentication context type
type AuthContextType = {
  user: User | null
  isLoading: boolean
  error: Error | null
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

// Create the authentication context
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  signOut: async () => {},
  refreshSession: async () => {},
})

// Hook to use the authentication context
export const useAuth = () => useContext(AuthContext)

// Authentication provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()

  // Function to recover from AuthSessionMissingError
  const recoverFromSessionError = async () => {
    try {
      // Clear all Supabase-related data from localStorage
      if (typeof window !== 'undefined') {
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key)
          }
        }
        
        // Remove all keys in a separate loop to avoid index shifting issues
        keysToRemove.forEach(key => {
          localStorage.removeItem(key)
        })
        
        console.log(`Cleared ${keysToRemove.length} Supabase-related items from localStorage`)
      }
      
      // Clear any auth cookies
      const supabase = getClientSupabaseClient()
      if (supabase) {
        await supabase.auth.signOut()
      }
      
      // Force redirect to login page
      window.location.href = '/login'
      return true
    } catch (err) {
      console.error("Error in session recovery:", err)
      return false
    }
  }
  
  // Function to refresh the session
  const refreshSession = async () => {
    try {
      // Check if we're on a public auth route where auth is not required
      const isPublicAuthRoute = typeof window !== 'undefined' && [
        '/login', 
        '/register', 
        '/verify', 
        '/forgot-password',
        '/reset-password'
      ].some(route => window.location.pathname.startsWith(route))

      const supabase = getClientSupabaseClient()
      if (!supabase) {
        throw new Error("Failed to create Supabase client")
      }

      // First try to get the user using getUser which is more secure
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (!userError && userData?.user) {
          setUser(userData.user)
          setError(null)
          return
        }
      } catch (e) {
        // Don't warn about auth errors on public routes
        if (!isPublicAuthRoute) {
          console.warn("getUser failed, trying refreshSession:", e)
        }
      }

      // If getUser fails, try to refresh the session
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        // Don't log AuthSessionMissingError on public routes
        if (!isPublicAuthRoute || 
            !(error && typeof error === 'object' && 'message' in error && 
              typeof error.message === 'string' && error.message.includes("Auth session missing"))) {
          console.error("Error refreshing session:", error)
        }
        
        // Check if it's an AuthSessionMissingError and try to recover
        if (error && typeof error === 'object' && 'message' in error && 
            typeof error.message === 'string' && error.message.includes("Auth session missing")) {
          // Only attempt recovery if we're not on a public auth route
          if (!isPublicAuthRoute) {
            console.warn("AuthSessionMissingError detected, attempting recovery...")
            await recoverFromSessionError()
          }
          return
        }
        
        throw error
      }

      if (data?.user) {
        setUser(data.user)
        setError(null)
      }
    } catch (err) {
      console.error("Error refreshing session:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  // Function to sign out
  const signOut = async () => {
    try {
      const supabase = getClientSupabaseClient()
      if (!supabase) {
        throw new Error("Failed to create Supabase client")
      }

      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error("Error signing out:", error)
        throw error
      }

      setUser(null)
      router.push("/login")
    } catch (err) {
      console.error("Error signing out:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  // Helper method to safely get the current user with proper error handling
  const getCurrentUser = async (supabase: ReturnType<typeof getClientSupabaseClient>) => {
    if (!supabase) return { user: null, error: new Error("No Supabase client") }
    
    // Try getUser first (most secure method)
    try {
      const { data, error } = await supabase.auth.getUser()
      if (!error && data?.user) {
        return { user: data.user, error: null }
      }
      
      // If getUser fails, try refreshSession
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError && refreshData?.user) {
        return { user: refreshData.user, error: null }
      }
      
      // If both methods fail, return the error
      return { user: null, error: error || refreshError || new Error("Authentication failed") }
    } catch (e) {
      console.error("Error getting current user:", e)
      return { user: null, error: e }
    }
  }
  
  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we're on a public auth route where auth is not required
        const isPublicAuthRoute = typeof window !== 'undefined' && [
          '/login', 
          '/register', 
          '/verify', 
          '/forgot-password',
          '/reset-password'
        ].some(route => window.location.pathname.startsWith(route))

        setIsLoading(true)
        const supabase = getClientSupabaseClient()
        if (!supabase) {
          throw new Error("Failed to create Supabase client")
        }

        // Get the current user using our helper method
        const { user: userData, error: authError } = await getCurrentUser(supabase)

        // Update state based on our authentication attempts
        if (userData) {
          setUser(userData)
          setError(null)
        } else {
          setUser(null)
          
          // Only set error if we're not on a public auth route or if it's not an AuthSessionMissingError
          if (!isPublicAuthRoute || 
              !(authError && 
                typeof authError === 'object' && 
                'message' in authError && 
                typeof authError.message === 'string' && 
                authError.message.includes("Auth session missing"))) {
            setError(authError instanceof Error ? authError : new Error(String(authError)))
          }
          
          // If we have an AuthSessionMissingError, try to recover only if not on a public route
          if (authError && 
              typeof authError === 'object' && 
              'message' in authError && 
              typeof authError.message === 'string' && 
              authError.message.includes("Auth session missing")) {
            
            if (!isPublicAuthRoute) {
              console.warn("Detected AuthSessionMissingError, attempting recovery...")
              await recoverFromSessionError()
            }
          }
        }
      } catch (err) {
        console.error("Error checking auth:", err)
        setUser(null)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Set up auth state change listener with improved handling
    const supabase = getClientSupabaseClient()
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log(`Auth state changed: ${event}`, session)
          if (event === "SIGNED_IN" && session?.user) {
            setUser(session.user)
            setError(null)
          } else if (event === "SIGNED_OUT") {
            setUser(null)
            // Clear any remaining auth data
            try {
              if (typeof window !== 'undefined') {
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i)
                  if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                    localStorage.removeItem(key)
                  }
                }
              }
            } catch (e) {
              console.warn('Error clearing localStorage after sign out:', e)
            }
          } else if (event === "USER_UPDATED" && session?.user) {
            setUser(session.user)
          } else if (event === "TOKEN_REFRESHED" && session?.user) {
            setUser(session.user)
            setError(null)
          } else if (event === "PASSWORD_RECOVERY") {
            // Handle password recovery event
            console.log("Password recovery flow initiated")
          }
        }
      )

      // Clean up the listener on unmount
      return () => {
        authListener.subscription.unsubscribe()
      }
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

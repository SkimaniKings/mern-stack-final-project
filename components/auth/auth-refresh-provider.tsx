"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"

interface AuthRefreshContextType {
  refreshToken: () => Promise<boolean>
  isRefreshing: boolean
  lastRefreshed: Date | null
}

const AuthRefreshContext = createContext<AuthRefreshContextType>({
  refreshToken: async () => false,
  isRefreshing: false,
  lastRefreshed: null
})

export const useAuthRefresh = () => useContext(AuthRefreshContext)

export function AuthRefreshProvider({ 
  children,
  refreshInterval = 15 * 60 * 1000 // 15 minutes by default
}: { 
  children: React.ReactNode
  refreshInterval?: number
}) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [isPostLogin, setIsPostLogin] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Function to refresh the token
  const refreshToken = async (): Promise<boolean> => {
    if (isRefreshing) return false
    
    // Check if we're on a public auth route where auth is not required
    const isPublicAuthRoute = typeof window !== 'undefined' && [
      '/login', 
      '/register', 
      '/verify', 
      '/forgot-password',
      '/reset-password'
    ].some(route => window.location.pathname.startsWith(route))
    
    // Skip token refresh on public auth routes
    if (isPublicAuthRoute) {
      return true
    }
    
    try {
      setIsRefreshing(true)
      const response = await fetch("/api/auth/refresh", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store"
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        // Don't log errors on public routes
        if (!isPublicAuthRoute) {
          console.error("Failed to refresh token:", data)
        }
        return false
      }
      
      setLastRefreshed(new Date())
      return true
    } catch (error) {
      // Don't log errors on public routes
      if (!isPublicAuthRoute) {
        console.error("Error refreshing token:", error)
      }
      return false
    } finally {
      setIsRefreshing(false)
    }
  }

  // Detect navigation from login page to dashboard (post-login)
  useEffect(() => {
    // If we're on the dashboard and we were previously on a public auth route,
    // we might have just logged in, so mark as post-login
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
      const previousPath = typeof window !== 'undefined' ? 
        sessionStorage.getItem('previousPath') : null
      
      if (previousPath && [
        '/login', 
        '/register', 
        '/verify'
      ].some(route => previousPath.startsWith(route))) {
        setIsPostLogin(true)
        
        // Clear the post-login state after 5 seconds
        const timer = setTimeout(() => {
          setIsPostLogin(false)
        }, 5000)
        
        return () => clearTimeout(timer)
      }
    }
    
    // Store the current path for future reference
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('previousPath', pathname)
    }
  }, [pathname])
  
  // Refresh token on initial load
  useEffect(() => {
    // Check if we're on a public auth route where auth is not required
    const isPublicAuthRoute = typeof window !== 'undefined' && [
      '/login', 
      '/register', 
      '/verify', 
      '/forgot-password',
      '/reset-password'
    ].some(route => window.location.pathname.startsWith(route))
    
    // Skip token refresh on public auth routes or if we just logged in
    if (!isPublicAuthRoute && !isPostLogin) {
      refreshToken()
    }
  }, [isPostLogin])

  // Set up periodic token refresh
  useEffect(() => {
    const interval = setInterval(async () => {
      // Check if we're on a public auth route where auth is not required
      const isPublicAuthRoute = typeof window !== 'undefined' && [
        '/login', 
        '/register', 
        '/verify', 
        '/forgot-password',
        '/reset-password'
      ].some(route => window.location.pathname.startsWith(route))
      
      // Skip token refresh on public auth routes or if we just logged in
      if (isPublicAuthRoute || isPostLogin) {
        return
      }
      
      const success = await refreshToken()
      if (!success) {
        // If token refresh fails, notify the user but don't redirect
        // This allows them to continue using the current page until they navigate
        toast.error("Your session is expiring. Please log in again soon.", {
          duration: 10000,
          action: {
            label: "Refresh Now",
            onClick: () => refreshToken()
          }
        })
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, isPostLogin])

  return (
    <AuthRefreshContext.Provider value={{ refreshToken, isRefreshing, lastRefreshed }}>
      {children}
    </AuthRefreshContext.Provider>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClientSupabaseClient } from '@/lib/supabase/client'
import Cookies from 'js-cookie'
import { v4 as uuidv4 } from 'uuid'

interface ClientAuthCheckProps {
  children: React.ReactNode
  fallbackUrl: string
}

export default function ClientAuthCheck({ children, fallbackUrl }: ClientAuthCheckProps) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [showContinuePrompt, setShowContinuePrompt] = useState(false)
  
  useEffect(() => {
    async function checkAuth() {
      try {
        // Check if user has chosen to continue without login
        const allowAccessWithoutLogin = localStorage.getItem('allow-access-without-login') === 'true'
        
        if (allowAccessWithoutLogin) {
          console.log('Allowing access without login based on user preference')
          setIsAuthenticated(true)
          return
        }
        
        // Get Supabase client
        const supabase = getClientSupabaseClient()
        if (!supabase) {
          console.error('Failed to get Supabase client')
          // Show the continue prompt instead of immediately redirecting
          setShowContinuePrompt(true)
          return
        }
        
        // Check if user is authenticated
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Authentication error:', error.message)
          
          // If token is expired, try to refresh it
          if (error.message.includes('token is expired') || 
              error.message.includes('invalid JWT') ||
              error.message.includes('token has invalid claims')) {
            
            try {
              // Try to refresh the session
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
              
              if (refreshError || !refreshData.session) {
                console.error('Failed to refresh session:', refreshError?.message)
                // Show the continue prompt instead of immediately redirecting
                setShowContinuePrompt(true)
                return
              }
              
              // Session refreshed successfully
              console.log('Session refreshed successfully')
              setIsAuthenticated(true)
              return
            } catch (refreshError) {
              console.error('Error refreshing session:', refreshError)
              // Show the continue prompt instead of immediately redirecting
              setShowContinuePrompt(true)
              return
            }
          }
          
          // Show the continue prompt instead of immediately redirecting
          setShowContinuePrompt(true)
          return
        }
        
        // Check if we have a valid session
        if (!data.session) {
          // No session, but let's check for client ID
          const clientId = Cookies.get('client-id')
          
          if (!clientId) {
            // Generate a new client ID and set it in a cookie
            const newClientId = uuidv4()
            Cookies.set('client-id', newClientId, { expires: 365 }) // 1 year expiration
            
            // Also set it as a header for API requests
            const userIdHeader = document.createElement('meta')
            userIdHeader.httpEquiv = 'x-user-id'
            userIdHeader.content = newClientId
            document.head.appendChild(userIdHeader)
          }
          
          // Show the continue prompt instead of immediately redirecting
          setShowContinuePrompt(true)
          return
        }
        
        // We have a valid session
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Error checking authentication:', error)
        // Show the continue prompt instead of immediately redirecting
        setShowContinuePrompt(true)
      }
    }
    
    checkAuth()
  }, [])
  
  // Handle different authentication states
  useEffect(() => {
    if (isAuthenticated === false && !showContinuePrompt) {
      // Redirect to login page after a short delay
      // This gives the browser time to set cookies
      const redirectTimer = setTimeout(() => {
        router.replace(fallbackUrl)
      }, 100)
      
      return () => clearTimeout(redirectTimer)
    }
  }, [isAuthenticated, router, fallbackUrl, showContinuePrompt])
  
  // Function to continue without login
  const continueWithoutLogin = () => {
    localStorage.setItem('allow-access-without-login', 'true')
    localStorage.setItem('debt-management-visited', 'true') // Set this flag for debt management
    setIsAuthenticated(true)
    setShowContinuePrompt(false)
  }
  
  // Show loading state while checking authentication
  if (isAuthenticated === null && !showContinuePrompt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  // Show continue prompt if needed
  if (showContinuePrompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="mb-6">
            This page requires authentication. You can sign in to access all features, or continue without logging in for limited functionality.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push(fallbackUrl)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Sign In
            </button>
            <button
              onClick={continueWithoutLogin}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Continue Without Login
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // If authenticated, render children
  if (isAuthenticated === true) {
    return <>{children}</>
  }
  
  // If not authenticated, render nothing (will redirect)
  return null
}

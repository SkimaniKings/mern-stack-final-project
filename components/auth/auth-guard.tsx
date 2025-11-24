"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-provider"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading, error } = useAuth()

  useEffect(() => {
    // If authentication has completed and there's no user, redirect to login
    if (!isLoading && !user) {
      router.push('/login?from=auth-guard')
    }
  }, [isLoading, user, router])
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    )
  }
  
  // Show error state if there was an authentication error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4 max-w-md mx-auto p-6 bg-destructive/10 rounded-lg">
          <div className="w-12 h-12 text-destructive flex items-center justify-center rounded-full bg-destructive/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-destructive">Authentication Error</h2>
          <p className="text-center text-muted-foreground">{error.message || 'There was an error verifying your authentication status'}</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }
  
  // Only render children if user is authenticated
  return user ? <>{children}</> : null
}

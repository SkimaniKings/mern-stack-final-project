"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Skip auth check for public auth routes
    const publicAuthRoutes = [
      '/login', 
      '/register', 
      '/verify', 
      '/verify/email', 
      '/forgot-password',
      '/reset-password'
    ]
    
    // If pathname is not available yet or we're on a public auth route, don't check authentication
    if (!pathname || publicAuthRoutes.some(route => pathname.startsWith(route))) {
      return
    }
    
    const checkAuth = async () => {
      try {
        const user = await getAuthenticatedUser()
        
        if (user && pathname !== '/dashboard') {
          // Prevent infinite redirects by checking if we're already on the dashboard
          router.push('/dashboard')
        }
      } catch (error) {
        console.error("Error checking auth:", error)
      }
    }

    checkAuth()
  }, [router, pathname])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-xl">Dripcheck</span>
          <span className="text-xs text-muted-foreground">Flaunting Responsibly</span>
        </div>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Dripcheck. All rights reserved.</p>
      </footer>
    </div>
  )
}

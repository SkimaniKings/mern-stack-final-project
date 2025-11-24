"use client"

import { useEffect } from 'react'

/**
 * ClientIdManager - A component that ensures every user has a persistent client ID
 * This ID is used to identify users who aren't authenticated but still need to
 * have their data persisted (like watchlist items)
 */
export function ClientIdManager() {
  useEffect(() => {
    // Check if we already have a client ID in cookies
    const cookies = document.cookie.split(';').map(c => c.trim())
    const clientIdCookie = cookies.find(c => c.startsWith('client-id='))
    
    if (!clientIdCookie) {
      // No client ID found, generate one
      let clientId = localStorage.getItem('finance_user_id')
      
      if (!clientId) {
        // Generate a new UUID
        clientId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
        localStorage.setItem('finance_user_id', clientId)
      }
      
      // Set the client ID as a cookie with a long expiration (1 year)
      const expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      document.cookie = `client-id=${clientId}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`
      
      // Also set it as a header for all future fetch requests
      const originalFetch = window.fetch
      window.fetch = function(input, init) {
        init = init || {}
        init.headers = init.headers || {}
        
        // Add the client ID to the headers
        const headers = new Headers(init.headers)
        headers.append('X-Client-ID', clientId)
        headers.append('X-User-ID', clientId)
        headers.append('X-Auth-User-ID', clientId)
        
        init.headers = headers
        
        return originalFetch(input, init)
      }
    }
  }, [])
  
  // This component doesn't render anything
  return null
}

'use client'

import { useEffect } from 'react'

/**
 * CookieCleaner component that specifically targets and fixes the
 * "Failed to parse cookie string: SyntaxError: Unexpected token 'b', "base64-eyJ"..."
 * error by cleaning up invalid Supabase cookies.
 */
export function CookieCleaner() {
  useEffect(() => {
    // This needs to run as early as possible
    if (typeof window !== 'undefined') {
      try {
        // Skip if we've already cleaned cookies in this session
        if (sessionStorage.getItem('cookies_cleaned')) {
          return;
        }
        
        // Only clean cookies if we're seeing the specific error
        const hasParsingError = window.console.error.toString().includes('Failed to parse cookie') || 
                              document.cookie.includes('base64-eyJ');
        
        if (!hasParsingError) {
          // No error detected, don't clean cookies
          return;
        }
        
        console.log('Cookie parsing error detected, cleaning problematic cookies');
        
        // Check for problematic cookies that start with "base64-eyJ"
        const cookies = document.cookie.split(';')
        let cookiesChanged = false
        
        cookies.forEach(cookie => {
          const trimmedCookie = cookie.trim()
          // Check if this is a problematic cookie value
          if (trimmedCookie.includes('base64-eyJ')) {
            console.log('Found problematic cookie, removing it')
            
            // Extract the cookie name
            const cookieName = trimmedCookie.split('=')[0]
            if (cookieName) {
              // Delete the cookie by setting expiration in the past
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
              cookiesChanged = true
            }
          }
          
          // Only check for invalid JSON in Supabase cookies if we've detected a parsing error
          if (hasParsingError && (trimmedCookie.startsWith('sb-') || trimmedCookie.startsWith('supabase'))) {
            const cookieName = trimmedCookie.split('=')[0]
            if (cookieName) {
              try {
                // Try to parse the cookie value to see if it's valid JSON
                const cookieValue = trimmedCookie.substring(cookieName.length + 1)
                JSON.parse(cookieValue)
                // If we get here, the JSON is valid
              } catch (e) {
                // Invalid JSON, delete the cookie
                console.log(`Found invalid JSON in cookie ${cookieName}, removing it`)
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
                cookiesChanged = true
              }
            }
          }
        })
        
        // If we changed cookies, store a flag but don't reload the page
        if (cookiesChanged) {
          console.log('Cookies cleaned, marking as done')
          sessionStorage.setItem('cookies_cleaned', 'true')
          // Don't reload the page to avoid disrupting navigation
        }
      } catch (error) {
        console.error('Error in CookieCleaner:', error)
      }
    }
  }, [])

  // This component doesn't render anything
  return null
}

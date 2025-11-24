'use client'

import { useEffect } from 'react'

/**
 * ErrorHandler component that captures console errors and stores them
 * for later use by other components. This helps detect and handle
 * cookie parsing errors and other authentication issues.
 */
export function ErrorHandler() {
  useEffect(() => {
    // Initialize the error storage if it doesn't exist
    if (typeof window !== 'undefined' && !(window as any).consoleErrors) {
      (window as any).consoleErrors = []
    }

    // Store the original console.error function
    const originalConsoleError = console.error

    // Override console.error to capture errors
    console.error = function(...args: any[]) {
      // Call the original function
      originalConsoleError.apply(console, args)

      // Store the error for later use
      if (typeof window !== 'undefined') {
        const error = args[0]
        // Store the error in the global array
        if (error) {
          (window as any).consoleErrors.push(error)
          // Keep only the last 10 errors to avoid memory leaks
          if ((window as any).consoleErrors.length > 10) {
            (window as any).consoleErrors.shift()
          }
        }
      }
    }

    // Cleanup function to restore original console.error
    return () => {
      console.error = originalConsoleError
    }
  }, [])

  // This component doesn't render anything
  return null
}

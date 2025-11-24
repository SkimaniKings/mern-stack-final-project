"use client"

import { Suspense } from "react"
import { AuthForm } from "@/components/auth/auth-form"

// Create a client component for the register content
const RegisterContent = () => {
  const RegisterWithParams = () => {
    "use client"
    
    const { useSearchParams } = require("next/navigation")
    const { useEffect, useState } = require("react")
    const { Alert, AlertDescription } = require("@/components/ui/alert")
    const { AlertCircle } = require("lucide-react")
    
    const searchParams = useSearchParams()
    const [statusMessage, setStatusMessage] = useState(null)

    useEffect(() => {
      // Check URL parameters for status messages
      const error = searchParams.get("error")
      const referral = searchParams.get("referral")
      
      if (error) {
        setStatusMessage({
          type: "error",
          message: "An error occurred during registration. Please try again.",
        })
      }
    }, [searchParams])

    return (
      <div className="w-full max-w-md space-y-4">
        {statusMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{statusMessage.message}</AlertDescription>
          </Alert>
        )}
        
        <AuthForm defaultTab="register" />
      </div>
    )
  }
  
  return (
    <RegisterWithParams />
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md space-y-4">
      <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
      <AuthForm defaultTab="register" />
    </div>}>
      <RegisterContent />
    </Suspense>
  )
}

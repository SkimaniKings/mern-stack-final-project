"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { AuthForm } from "@/components/auth/auth-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const [statusMessage, setStatusMessage] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null)

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

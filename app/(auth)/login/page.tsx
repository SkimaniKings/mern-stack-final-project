"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { AuthForm } from "@/components/auth/auth-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [statusMessage, setStatusMessage] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null)

  useEffect(() => {
    // Check URL parameters for status messages
    const error = searchParams.get("error")
    const success = searchParams.get("success")
    const reset = searchParams.get("reset")
    const verified = searchParams.get("verified")
    const from = searchParams.get("from")

    if (error === "session") {
      setStatusMessage({
        type: "error",
        message: "Your session has expired. Please sign in again.",
      })
    } else if (error) {
      setStatusMessage({
        type: "error",
        message: "An error occurred. Please try again.",
      })
    } else if (reset === "success") {
      setStatusMessage({
        type: "success",
        message: "Your password has been reset successfully. Please sign in with your new password.",
      })
    } else if (verified === "true") {
      setStatusMessage({
        type: "success",
        message: "Your email has been verified. You can now sign in.",
      })
    } else if (from === "require_auth") {
      setStatusMessage({
        type: "error",
        message: "Please sign in to access that page.",
      })
    }
  }, [searchParams])

  return (
    <div className="w-full max-w-md space-y-4">
      {statusMessage && (
        <Alert
          variant={statusMessage.type === "error" ? "destructive" : "default"}
          className={statusMessage.type === "success" ? "bg-green-50 text-green-800 border-green-200" : ""}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle className="h-4 w-4 mr-2" />
          ) : (
            <AlertCircle className="h-4 w-4 mr-2" />
          )}
          <AlertDescription>{statusMessage.message}</AlertDescription>
        </Alert>
      )}
      
      <AuthForm defaultTab="login" />
    </div>
  )
}

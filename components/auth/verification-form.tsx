"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getClientSupabaseClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, Mail, Clock } from "lucide-react"

export function VerificationForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendCount, setResendCount] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const supabase = getClientSupabaseClient()
  
  // Track countdown for resend cooldown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResendVerification = async () => {
    if (countdown > 0 || !email) return
    
    setResendLoading(true)
    setError(null)
    setResendSuccess(false)
    
    try {
      if (!supabase) {
        throw new Error("Authentication service is not available. Please try again later.")
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) {
        console.error("Error resending verification:", error)
        setError(error.message)
        return
      }
      
      // Success
      setResendSuccess(true)
      setResendCount(prev => prev + 1)
      setCountdown(60) // 60 second cooldown
    } catch (err) {
      console.error("Error resending verification:", err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred")
      }
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoToLogin = () => {
    router.push("/login?verified=true")
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-2xl">Verify your email</CardTitle>
        <CardDescription>
          {email ? (
            <>
              We've sent a verification link to <span className="font-medium">{email}</span>
            </>
          ) : (
            "Check your email for a verification link"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {resendSuccess && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
            <CheckCircle className="h-4 w-4 mr-2" />
            <AlertDescription>
              Verification email resent successfully. Please check your inbox.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-start space-x-4">
            <Mail className="h-6 w-6 text-primary mt-1" />
            <div className="space-y-2">
              <h3 className="font-medium">Check your email</h3>
              <p className="text-sm text-muted-foreground">
                We've sent a verification link to your email address. Click the link to verify your account.
              </p>
              <p className="text-sm text-muted-foreground">
                If you don't see the email, check your spam folder.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-2">
          <Button
            variant="outline"
            onClick={handleResendVerification}
            disabled={resendLoading || countdown > 0}
            className="w-full"
          >
            {resendLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : countdown > 0 ? (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Resend in {countdown}s
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>
          
          <Button 
            variant="link" 
            onClick={() => router.push("/login")}
            className="w-full"
          >
            Back to login
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Already verified? <Button variant="link" className="p-0 h-auto font-normal" onClick={handleGoToLogin}>Sign in</Button>
        </p>
      </CardFooter>
    </Card>
  )
}

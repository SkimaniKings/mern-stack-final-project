"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getClientSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ShieldAlert, CheckCircle } from "lucide-react"

// Password validation schema
const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" }
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character" }
  }
  return { valid: true }
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = getClientSupabaseClient()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<number>(0)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Check if user is authenticated via the reset password flow
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error("Session error:", error)
          setIsAuthenticated(false)
          return
        }
        
        if (!data.session) {
          setIsAuthenticated(false)
          return
        }
        
        // Verify this is actually a password reset flow
        const hash = window.location.hash
        const hasAccessToken = hash.includes("access_token=")
        const hasType = hash.includes("type=recovery")
        
        if (data.session && (hasAccessToken || hasType)) {
          setIsAuthenticated(true)
        } else {
          // User is logged in but not through password reset flow
          setIsAuthenticated(false)
        }
      } catch (err) {
        console.error("Error checking session:", err)
        setIsAuthenticated(false)
      }
    }

    checkSession()
  }, [supabase.auth])

  // Update password strength meter when password changes
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0)
      return
    }
    
    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1
    
    setPasswordStrength(strength)
  }, [password])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.message)
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setError(error.message)
        return
      }
      
      // Show success message before redirecting
      setSuccess(true)
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push("/login?reset=success")
      }, 2000)
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // If authentication status is still being determined
  if (isAuthenticated === null) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Checking authentication...</CardTitle>
          <CardDescription>Please wait while we verify your session</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  // If not authenticated through the password reset flow
  if (isAuthenticated === false) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
          <CardDescription>This password reset link is invalid or has expired.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            Please request a new password reset link to continue.
          </p>
          <Button asChild>
            <Link href="/forgot-password">Request New Link</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // If password reset was successful
  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Password Updated!</CardTitle>
          <CardDescription>Your password has been successfully updated.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            You will be redirected to the login page shortly.
          </p>
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    )
  }

  // Main password reset form
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Set New Password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              autoComplete="new-password"
              required
            />
            {/* Password strength meter */}
            {password && (
              <div className="mt-2">
                <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${passwordStrength <= 2 ? 'bg-red-500' : passwordStrength <= 3 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  />
                </div>
                <p className="text-xs mt-1 text-muted-foreground">
                  {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Moderate' : 'Strong'} password
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Password must:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li className={password.length >= 8 ? "text-green-600" : ""}>Be at least 8 characters long</li>
              <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>Include an uppercase letter</li>
              <li className={/[a-z]/.test(password) ? "text-green-600" : ""}>Include a lowercase letter</li>
              <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>Include a number</li>
              <li className={/[^A-Za-z0-9]/.test(password) ? "text-green-600" : ""}>Include a special character</li>
            </ul>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}


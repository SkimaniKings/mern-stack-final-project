"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { getClientSupabaseClient } from "@/lib/supabase/client"
import { createUserRecord, updateLastLoginTimestamp } from "@/lib/services/user-service"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Mail, KeyRound } from "lucide-react"

// Login form schema
const loginSchema = z.object({
  email: z.string().min(1, { message: "Email is required" }).email({ message: "Please enter a valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
})

// Registration form schema with strong password requirements
const registerSchema = z.object({
  email: z.string().min(1, { message: "Email is required" }).email({ message: "Please enter a valid email" }),
  password: z
    .string()
    .min(10, { message: "Password must be at least 10 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" }),
  confirmPassword: z.string(),
  agreeTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type LoginFormValues = z.infer<typeof loginSchema>
type RegisterFormValues = z.infer<typeof registerSchema>

export function AuthForm({ defaultTab = "login" }: { defaultTab?: "login" | "register" }) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [termsDialogOpen, setTermsDialogOpen] = useState(false)
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false)
  const router = useRouter()
  
  // Initialize Supabase client
  const supabase = getClientSupabaseClient()

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  })

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false,
    },
  })

  // Handle login form submission
  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (!supabase) {
        throw new Error("Authentication service is not available. Please try again later.")
      }
      
      // Always use a consistent error message for login failures to prevent email enumeration
      const genericLoginError = "Invalid email or password. Please try again."
      
      // Clear any existing Supabase auth data before login
      try {
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
              localStorage.removeItem(key)
            }
          }
        }
      } catch (e) {
        console.warn('Error clearing localStorage before login:', e)
      }

      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      
      if (error) {
        console.error("Login error:", error)
        // Use generic error message to prevent email enumeration
        throw new Error(genericLoginError)
      }

      // Update last login timestamp
      if (data?.user) {
        try {
          await updateLastLoginTimestamp(data.user.id)
        } catch (updateError) {
          console.error("Error updating last login timestamp:", updateError)
          // Non-critical error, don't throw
        }
      }

      // Success - redirect to dashboard
      setSuccess("Login successful! Redirecting...")
      setIsRedirecting(true)
      
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 1000)
    } catch (err) {
      console.error("Login error:", err)
      // Use generic error message for all login failures
      setError(
        err instanceof Error ? err.message : "Invalid email or password. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Handle registration form submission
  const handleRegister = async (values: RegisterFormValues) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (!supabase) {
        throw new Error("Authentication service is not available. Please try again later.")
      }
      
      // Create the user account with secure password hashing (handled by Supabase)
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            // Store minimal user data
            email: values.email,
            created_at: new Date().toISOString(),
          },
        },
      })
      
      if (error) {
        console.error("Registration error:", error)
        // Use a generic error message to prevent email enumeration
        if (error.message.includes("already registered")) {
          throw new Error("Registration failed. Please try again with different credentials.")
        }
        throw error
      }

      // Create a user record in our database
      if (data?.user) {
        try {
          // Generate a username based on email
          const emailPrefix = values.email.split('@')[0];
          const username = `${emailPrefix}${Math.floor(Math.random() * 1000)}`;
          
          await createUserRecord(
            data.user.id,
            username,
            data.user.email || values.email
          )
        } catch (userRecordError) {
          console.error("Error creating user record:", userRecordError)
          // We don't throw here because the auth account was created successfully
          // The user record can be created later when they log in
        }

        // Check if email confirmation is required
        if (data.user && !data.user.confirmed_at) {
          setSuccess("Registration successful! Please check your email to verify your account.")
          setIsRedirecting(true)
          
          // Reset form
          registerForm.reset()
          
          // Redirect to verification page
          setTimeout(() => {
            router.push(`/verify?email=${encodeURIComponent(values.email)}`)
          }, 2000)
        } else {
          // User is already confirmed (unlikely for new registrations)
          setSuccess("Registration successful! Redirecting to dashboard...")
          setIsRedirecting(true)
          
          setTimeout(() => {
            router.push("/dashboard")
            router.refresh()
          }, 1000)
        }
      }
    } catch (err) {
      console.error("Registration error:", err)
      setError(
        err instanceof Error 
          ? err.message 
          : "An unexpected error occurred during registration. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Terms of Service Dialog Content
  const renderTermsDialog = () => {
    return (
      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
            <DialogDescription>
              Last updated: {new Date().toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p>
              By using the Dripcheck service, you agree to these terms and conditions.
            </p>
            <p>
              <strong>1. Account Security</strong>: You are responsible for maintaining the security of your account credentials.
            </p>
            <p>
              <strong>2. Privacy</strong>: We collect and process your data as described in our Privacy Policy.
            </p>
            <p>
              <strong>3. Acceptable Use</strong>: You agree not to use the service for any illegal or unauthorized purpose.
            </p>
            <p>
              <strong>4. Termination</strong>: We reserve the right to terminate or suspend your account at our discretion.
            </p>
          </div>
          <Button onClick={() => setTermsDialogOpen(false)} className="mt-4">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    )
  }

  // Privacy Policy Dialog Content
  const renderPrivacyDialog = () => {
    return (
      <Dialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription>
              Last updated: {new Date().toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p>
              This Privacy Policy describes how we collect, use, and share your personal information.
            </p>
            <p>
              <strong>1. Information We Collect</strong>: We collect information you provide directly to us, such as your email and password.
            </p>
            <p>
              <strong>2. How We Use Information</strong>: We use your information to provide, maintain, and improve our services.
            </p>
            <p>
              <strong>3. Data Security</strong>: We implement appropriate security measures to protect your personal information.
            </p>
            <p>
              <strong>4. Your Rights</strong>: You have the right to access, update, or delete your personal information.
            </p>
          </div>
          <Button onClick={() => setPrivacyDialogOpen(false)} className="mt-4">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Dripcheck</CardTitle>
          <CardDescription className="text-center">
            {activeTab === "login" ? "Sign in to your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            {/* Login form */}
            <TabsContent value="login" className="space-y-4 mt-4">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginEmail" className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={isLoading || isRedirecting}
                    {...loginForm.register("email")}
                    className={loginForm.formState.errors.email ? "border-red-500" : ""}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-red-500 text-sm">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="loginPassword" className="flex items-center">
                    <KeyRound className="h-4 w-4 mr-2 text-muted-foreground" />
                    Password
                  </Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    autoComplete="current-password"
                    disabled={isLoading || isRedirecting}
                    {...loginForm.register("password")}
                    className={loginForm.formState.errors.password ? "border-red-500" : ""}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-red-500 text-sm">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="rememberMe" 
                    checked={loginForm.watch("rememberMe")} 
                    onCheckedChange={(checked) => {
                      loginForm.setValue("rememberMe", checked === true, { 
                        shouldValidate: true 
                      });
                    }}
                    disabled={isLoading || isRedirecting}
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal">
                    Remember me
                  </Label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || isRedirecting}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </TabsContent>
            
            {/* Register form */}
            <TabsContent value="register" className="space-y-4 mt-4">
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="registerEmail" className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="registerEmail"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={isLoading || isRedirecting}
                    {...registerForm.register("email")}
                    className={registerForm.formState.errors.email ? "border-red-500" : ""}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-red-500 text-sm">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="registerPassword" className="flex items-center">
                    <KeyRound className="h-4 w-4 mr-2 text-muted-foreground" />
                    Password
                  </Label>
                  <Input
                    id="registerPassword"
                    type="password"
                    autoComplete="new-password"
                    disabled={isLoading || isRedirecting}
                    {...registerForm.register("password")}
                    className={registerForm.formState.errors.password ? "border-red-500" : ""}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-red-500 text-sm">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    disabled={isLoading || isRedirecting}
                    {...registerForm.register("confirmPassword")}
                    className={registerForm.formState.errors.confirmPassword ? "border-red-500" : ""}
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-red-500 text-sm">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="agreeTerms" 
                    checked={registerForm.watch("agreeTerms")} 
                    onCheckedChange={(checked) => {
                      registerForm.setValue("agreeTerms", checked === true, { 
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true
                      });
                    }}
                    disabled={isLoading || isRedirecting}
                  />
                  <Label htmlFor="agreeTerms" className="text-sm font-normal">
                    I agree to the{" "}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-normal text-sm" 
                      type="button"
                      onClick={() => setTermsDialogOpen(true)}
                    >
                      Terms of Service
                    </Button>
                    {" "}and{" "}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-normal text-sm" 
                      type="button"
                      onClick={() => setPrivacyDialogOpen(true)}
                    >
                      Privacy Policy
                    </Button>
                  </Label>
                </div>
                {registerForm.formState.errors.agreeTerms && (
                  <p className="text-red-500 text-sm">{registerForm.formState.errors.agreeTerms.message}</p>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || isRedirecting}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Render the dialog components */}
      {renderTermsDialog()}
      {renderPrivacyDialog()}
    </>
  )
}

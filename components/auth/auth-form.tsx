"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { getClientSupabaseClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
import { createUserRecord, updateLastLoginTimestamp } from "@/lib/services/user-service"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Mail, KeyRound, CheckCircle } from "lucide-react"

// Login form schema
const loginSchema = z.object({
  email: z.string().min(1, { message: "Email is required" }).email({ message: "Please enter a valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional(),
})

// Registration form schema
const registerSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  email: z.string().min(1, { message: "Email is required" }).email({ message: "Please enter a valid email" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
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
  
  // Initialize Supabase client in a way that ensures it's only created in the browser
  // This helps prevent serialization issues with server components
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
      firstName: "",
      lastName: "",
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (error) {
        if (error.message.includes("Invalid login") || error.message.includes("credentials")) {
          setError("Invalid email or password. Please try again.")
        } else if (error.message.includes("Email not confirmed")) {
          setError("Please verify your email before logging in.")
          setTimeout(() => {
            router.push(`/verify?email=${encodeURIComponent(values.email)}`)
          }, 2000)
        } else {
          setError(error.message)
        }
        return
      }

      // Success - redirect to dashboard
      setSuccess("Login successful! Redirecting...")
      setIsRedirecting(true)
      
      // Update last login timestamp in the users table
      if (data.user) {
        // Update the last login timestamp
        await updateLastLoginTimestamp(data.user.id)
      }
      
      // Use window.location for a more reliable redirect
      window.location.href = "/dashboard"
    } catch (err) {
      console.error("Login error:", err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred during login")
      }
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

      // Register with email and password
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: values.firstName,
            last_name: values.lastName,
          },
        },
      })

      if (error) {
        console.error("Registration error:", error)
        setError(error.message)
        return
      }

      if (data.user) {
        // Generate a username based on first and last name
        const baseUsername = `${values.firstName.toLowerCase()}${values.lastName.toLowerCase()}`
        const username = `${baseUsername}${Math.floor(Math.random() * 1000)}` // Add random numbers to make it unique
        
        // Create user record in public.users table
        const { success, error: userError } = await createUserRecord(
          data.user.id,
          username,
          values.email
        )
        
        if (!success) {
          console.error("Error creating user record:", userError)
        }
      }

      // Check if email confirmation is required
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("Registration failed. Please try again or use a different email.")
        return
      }

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
    } catch (err) {
      console.error("Registration error:", err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unexpected error occurred during registration")
      }
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
              Please read these terms carefully before using our service.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <h3 className="font-medium">1. Acceptance of Terms</h3>
            <p>By accessing or using Dripcheck, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
            
            <h3 className="font-medium">2. User Accounts</h3>
            <p>You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>
            
            <h3 className="font-medium">3. User Conduct</h3>
            <p>You agree not to use the service for any illegal or unauthorized purpose. You must not violate any laws in your jurisdiction.</p>
            
            <h3 className="font-medium">4. Intellectual Property</h3>
            <p>The service and its original content, features, and functionality are owned by Dripcheck and are protected by international copyright, trademark, and other intellectual property laws.</p>
            
            <h3 className="font-medium">5. Termination</h3>
            <p>We may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason.</p>
            
            <h3 className="font-medium">6. Limitation of Liability</h3>
            <p>In no event shall Dripcheck be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>
            
            <h3 className="font-medium">7. Changes to Terms</h3>
            <p>We reserve the right to modify or replace these terms at any time. It is your responsibility to check these terms periodically for changes.</p>
            
            <h3 className="font-medium">8. Contact Us</h3>
            <p>If you have any questions about these Terms, please contact us.</p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setTermsDialogOpen(false)}>Close</Button>
          </div>
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
              Your privacy is important to us. This policy outlines how we collect and use your data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <h3 className="font-medium">1. Information We Collect</h3>
            <p>We collect information you provide directly to us when you create an account, such as your name, email address, and other profile information.</p>
            
            <h3 className="font-medium">2. How We Use Your Information</h3>
            <p>We use the information we collect to provide, maintain, and improve our services, communicate with you, and for account management purposes.</p>
            
            <h3 className="font-medium">3. Information Sharing</h3>
            <p>We do not share your personal information with third parties except as described in this privacy policy or with your consent.</p>
            
            <h3 className="font-medium">4. Data Security</h3>
            <p>We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.</p>
            
            <h3 className="font-medium">5. Data Retention</h3>
            <p>We retain your information for as long as your account is active or as needed to provide you services, comply with legal obligations, resolve disputes, and enforce our agreements.</p>
            
            <h3 className="font-medium">6. Your Rights</h3>
            <p>You have the right to access, correct, or delete your personal information. You may also have the right to object to or restrict certain processing of your data.</p>
            
            <h3 className="font-medium">7. Changes to This Policy</h3>
            <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
            
            <h3 className="font-medium">8. Contact Us</h3>
            <p>If you have any questions about this Privacy Policy, please contact us.</p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setPrivacyDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {activeTab === "login" ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {activeTab === "login" 
              ? "Sign in to your account to continue" 
              : "Enter your information to create an account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error and success messages */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {isRedirecting && (
            <div className="flex justify-center my-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Tabs for login and register */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            {/* Login form */}
            <TabsContent value="login" className="space-y-4 mt-4">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="email"
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="flex items-center">
                      <KeyRound className="h-4 w-4 mr-2 text-muted-foreground" />
                      Password
                    </Label>
                    <Button 
                      variant="link" 
                      className="px-0 font-normal text-xs"
                      type="button"
                      onClick={() => router.push("/forgot-password")}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Input
                    id="password"
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
                    {...loginForm.register("rememberMe")} 
                    disabled={isLoading || isRedirecting}
                  />
                  <Label htmlFor="rememberMe" className="text-sm font-normal">Remember me for 30 days</Label>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      autoComplete="given-name"
                      disabled={isLoading || isRedirecting}
                      {...registerForm.register("firstName")}
                      className={registerForm.formState.errors.firstName ? "border-red-500" : ""}
                    />
                    {registerForm.formState.errors.firstName && (
                      <p className="text-red-500 text-sm">{registerForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      autoComplete="family-name"
                      disabled={isLoading || isRedirecting}
                      {...registerForm.register("lastName")}
                      className={registerForm.formState.errors.lastName ? "border-red-500" : ""}
                    />
                    {registerForm.formState.errors.lastName && (
                      <p className="text-red-500 text-sm">{registerForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                
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

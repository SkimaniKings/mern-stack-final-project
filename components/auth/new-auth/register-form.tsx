"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Loader2, Mail, KeyRound, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "./auth-provider";

// Registration form schema with strong password requirements
const registerSchema = z.object({
  email: z.string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email" }),
  password: z.string()
    .min(10, { message: "Password must be at least 10 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" }),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { register: registerUser, isLoading, error } = useAuth();
  const [success, setSuccess] = useState<string | null>(null);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  
  // Initialize form
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
  });
  
  // Handle form submission
  const onSubmit = async (values: RegisterFormValues) => {
    setSuccess(null);
    
    try {
      await registerUser({
        email: values.email,
        password: values.password,
        agreeToTerms: values.agreeToTerms,
      });
      
      setSuccess("Registration successful! Please check your email to verify your account.");
      form.reset();
    } catch (err) {
      // Error is handled by the auth provider
      console.error("Registration submission error:", err);
    }
  };
  
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
    );
  };

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
    );
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Sign up for a new account to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              disabled={isLoading}
              {...form.register("email")}
              className={form.formState.errors.email ? "border-red-500" : ""}
            />
            {form.formState.errors.email && (
              <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center">
              <KeyRound className="h-4 w-4 mr-2 text-muted-foreground" />
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
              {...form.register("password")}
              className={form.formState.errors.password ? "border-red-500" : ""}
            />
            {form.formState.errors.password && (
              <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>
            )}
            <div className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Password must be at least 10 characters and include uppercase, lowercase, 
                number, and special character.
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
              {...form.register("confirmPassword")}
              className={form.formState.errors.confirmPassword ? "border-red-500" : ""}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-red-500 text-sm">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="agreeToTerms" 
              checked={form.watch("agreeToTerms")} 
              onCheckedChange={(checked) => {
                form.setValue("agreeToTerms", checked === true, { 
                  shouldValidate: true,
                  shouldDirty: true,
                  shouldTouch: true
                });
              }}
              disabled={isLoading}
            />
            <Label htmlFor="agreeToTerms" className="text-sm font-normal">
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
          {form.formState.errors.agreeToTerms && (
            <p className="text-red-500 text-sm">{form.formState.errors.agreeToTerms.message}</p>
          )}
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
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
          
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
      
      {/* Render the dialog components */}
      {renderTermsDialog()}
      {renderPrivacyDialog()}
    </Card>
  );
}

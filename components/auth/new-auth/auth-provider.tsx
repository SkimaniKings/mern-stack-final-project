"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { AuthContextType, AuthUser, LoginCredentials, RegisterCredentials } from "./auth-types";

// Create the authentication context
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
});

// Hook to use the authentication context
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();
  
  // Initialize Supabase client
  const supabase = createClientComponentClient();

  // Helper function to safely clear auth data
  const clearAuthData = async () => {
    try {
      if (typeof window !== "undefined") {
        // Clear Supabase-related items from localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (err) {
      console.error("Error clearing auth data:", err);
    }
  };

  // Helper function to safely get the current user
  const getCurrentUser = async () => {
    try {
      // Try getUser first (most secure method)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (!userError && userData?.user) {
        return {
          user: {
            id: userData.user.id,
            email: userData.user.email || "",
            emailVerified: userData.user.email_confirmed_at ? true : false,
            lastLogin: userData.user.last_sign_in_at,
            createdAt: userData.user.created_at,
          },
          error: null,
        };
      }
      
      // If getUser fails, try refreshSession
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && refreshData?.user) {
        return {
          user: {
            id: refreshData.user.id,
            email: refreshData.user.email || "",
            emailVerified: refreshData.user.email_confirmed_at ? true : false,
            lastLogin: refreshData.user.last_sign_in_at,
            createdAt: refreshData.user.created_at,
          },
          error: null,
        };
      }
      
      // If both methods fail, return the error
      return {
        user: null,
        error: userError || refreshError || new Error("Authentication failed"),
      };
    } catch (err) {
      console.error("Error getting current user:", err);
      return {
        user: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  };

  // Login function
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Clear any existing auth data before login
      await clearAuthData();
      
      // Generic error message to prevent email enumeration
      const genericErrorMessage = "Invalid email or password. Please try again.";
      
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      
      if (error) {
        console.error("Login error:", error);
        // Use generic error message to prevent email enumeration
        throw new Error(genericErrorMessage);
      }
      
      if (data?.user) {
        // Update user state
        setUser({
          id: data.user.id,
          email: data.user.email || "",
          emailVerified: data.user.email_confirmed_at ? true : false,
          lastLogin: data.user.last_sign_in_at,
          createdAt: data.user.created_at,
        });
        
        // Update last login timestamp in the database
        await supabase
          .from("users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", data.user.id);
        
        // Redirect to dashboard
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err : new Error("An unexpected error occurred during login"));
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Generic error message to prevent email enumeration
      const genericErrorMessage = "Registration failed. Please try again with different credentials.";
      
      // Sign up with email and password
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email: credentials.email,
            created_at: new Date().toISOString(),
          },
        },
      });
      
      if (error) {
        console.error("Registration error:", error);
        // Use a generic error message to prevent email enumeration
        if (error.message.includes("already registered")) {
          throw new Error(genericErrorMessage);
        }
        throw error;
      }
      
      if (data?.user) {
        // Create a user record in the database
        try {
          // Generate a username based on email
          const emailPrefix = credentials.email.split('@')[0];
          const username = `${emailPrefix}${Math.floor(Math.random() * 1000)}`;
          
          await supabase.from("users").insert({
            id: data.user.id,
            email: data.user.email,
            username: username,
            created_at: new Date().toISOString(),
          });
        } catch (userRecordError) {
          console.error("Error creating user record:", userRecordError);
          // Non-critical error, don't throw
        }
        
        // Check if email confirmation is required
        if (data.user && !data.user.email_confirmed_at) {
          // Redirect to verification page
          router.push(`/verify?email=${encodeURIComponent(credentials.email)}`);
        } else {
          // User is already confirmed (unlikely for new registrations)
          setUser({
            id: data.user.id,
            email: data.user.email || "",
            emailVerified: data.user.email_confirmed_at ? true : false,
            lastLogin: data.user.last_sign_in_at,
            createdAt: data.user.created_at,
          });
          
          // Redirect to dashboard
          router.push("/dashboard");
        }
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err instanceof Error ? err : new Error("An unexpected error occurred during registration"));
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    try {
      // Sign out
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error);
        throw error;
      }
      
      // Clear auth data
      await clearAuthData();
      
      // Update state
      setUser(null);
      
      // Redirect to login page
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      setError(err instanceof Error ? err : new Error("An unexpected error occurred during logout"));
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh session function
  const refreshSession = async () => {
    setIsLoading(true);
    
    try {
      const { user: currentUser, error: userError } = await getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        setError(null);
      } else if (userError) {
        // Check if it's an AuthSessionMissingError
        if (userError.message.includes("Auth session missing")) {
          // Clear auth data and redirect to login
          await clearAuthData();
          await supabase.auth.signOut();
          setUser(null);
          router.push("/login");
        } else {
          throw userError;
        }
      }
    } catch (err) {
      console.error("Session refresh error:", err);
      setError(err instanceof Error ? err : new Error("An unexpected error occurred during session refresh"));
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      
      try {
        const { user: currentUser, error: userError } = await getCurrentUser();
        
        if (currentUser) {
          setUser(currentUser);
          setError(null);
        } else {
          setUser(null);
          
          // Check if it's an AuthSessionMissingError
          if (userError && userError.message.includes("Auth session missing")) {
            // Clear auth data
            await clearAuthData();
          }
          
          setError(userError);
        }
      } catch (err) {
        console.error("Auth check error:", err);
        setUser(null);
        setError(err instanceof Error ? err : new Error("An unexpected error occurred during authentication check"));
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth state changed: ${event}`, session);
        
        if (event === "SIGNED_IN" && session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            emailVerified: session.user.email_confirmed_at ? true : false,
            lastLogin: session.user.last_sign_in_at,
            createdAt: session.user.created_at,
          });
          setError(null);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          // Clear any remaining auth data
          await clearAuthData();
        } else if (event === "USER_UPDATED" && session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            emailVerified: session.user.email_confirmed_at ? true : false,
            lastLogin: session.user.last_sign_in_at,
            createdAt: session.user.created_at,
          });
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            emailVerified: session.user.email_confirmed_at ? true : false,
            lastLogin: session.user.last_sign_in_at,
            createdAt: session.user.created_at,
          });
          setError(null);
        } else if (event === "PASSWORD_RECOVERY") {
          // Handle password recovery event
          console.log("Password recovery flow initiated");
        }
      }
    );
    
    // Clean up the listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

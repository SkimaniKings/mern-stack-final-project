"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading, refreshSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for public routes
      if (
        pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/forgot-password" ||
        pathname === "/reset-password" ||
        pathname === "/verify" ||
        pathname === "/auth/callback" ||
        pathname === "/"
      ) {
        setIsCheckingAuth(false);
        return;
      }

      // If we're still loading auth state, wait
      if (isLoading) {
        return;
      }

      // If we're not authenticated and not on a public route, redirect to login
      if (!user) {
        // Try to refresh the session once before redirecting
        try {
          await refreshSession();
          // If we're still not authenticated after refresh, redirect
          if (!user) {
            router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
          }
        } catch (error) {
          console.error("Auth refresh failed:", error);
          router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
        }
      }

      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [user, isLoading, pathname, router, refreshSession]);

  // Show loading indicator while checking authentication
  if (isLoading || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // For public routes or authenticated users, render children
  return <>{children}</>;
}

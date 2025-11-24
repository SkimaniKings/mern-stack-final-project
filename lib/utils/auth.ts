import { createClient } from "@/lib/supabase/index"
import { redirect } from "next/navigation"

/**
 * Type definition for user roles
 */
export type UserRole = "admin" | "user" | "viewer"

/**
 * Checks if the current user has the required role
 * @param requiredRole The role required to access a resource
 * @returns Promise that resolves to true if user has the required role
 */
export async function checkUserRole(requiredRole: UserRole): Promise<boolean> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  const userRoles = user.app_metadata?.roles || []
  return userRoles.includes(requiredRole)
}

/**
 * Higher-order function that protects a route based on user role
 * @param requiredRole The role required to access the route
 */
export async function protectRouteByRole(requiredRole: UserRole) {
  const hasRole = await checkUserRole(requiredRole)

  if (!hasRole) {
    redirect("/access-denied")
  }
}

/**
 * Gets the required role for a specific path
 * @param path The path to check
 * @returns The required role or undefined if no specific role is required
 */
export function getRequiredRoleForPath(path: string): UserRole | undefined {
  // Define path patterns and their required roles
  const roleRequirements: Record<string, UserRole> = {
    "/admin": "admin",
    "/settings": "admin",
    "/reports": "user",
    // Add more path patterns as needed
  }

  // Check if the path matches any of the patterns
  for (const [pattern, role] of Object.entries(roleRequirements)) {
    if (path.startsWith(pattern)) {
      return role
    }
  }

  // Default: no specific role required
  return undefined
}


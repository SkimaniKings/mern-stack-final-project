import type React from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth"

import { ResponsiveLayout } from "@/components/layout/responsive-layout"
import ClientAuthCheck from "@/components/auth/client-auth-check"

export const metadata: Metadata = {
  title: {
    default: "DripCheck",
    template: "%s | DripCheck",
  },
  description: "Flaunting responsibly - A comprehensive personal finance tracking application",
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use client-side authentication check for all cases
  // This avoids server-side JWT validation errors completely
  return (
    <ClientAuthCheck fallbackUrl="/login?from=protected">
      <ResponsiveLayout>
        {children}
      </ResponsiveLayout>
    </ClientAuthCheck>
  )
}

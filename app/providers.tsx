"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider"
import { type ReactNode } from "react"
import { ClientIdManager } from "@/components/client/client-id-manager"
import { AuthRefreshProvider } from "@/components/auth/auth-refresh-provider"
import { Toaster } from "sonner"

const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthRefreshProvider refreshInterval={10 * 60 * 1000}> {/* Refresh every 10 minutes */}
          <ClientIdManager />
          {children}
          <Toaster position="top-right" richColors />
        </AuthRefreshProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

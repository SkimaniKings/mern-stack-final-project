import React, { Suspense } from "react"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { MainNavigation } from "@/components/layout/main-navigation"
import { Providers } from "./providers"
import { ErrorHandler } from "@/components/error/error-handler"
import { CookieCleaner } from "@/components/error/cookie-cleaner"
import { ClientIdManager } from "@/components/client-id-manager"
import { SessionInitializer } from "@/components/auth/session-initializer"
import GoogleAnalytics from "./components/GoogleAnalytics"
import { GoogleTagManager, GTMNoScript } from "@/components/GoogleTagManager"
import "./globals.css"
import {
  Home,
  CreditCard,
  PiggyBank,
  BarChart3,
  Receipt,
  Calendar,
  DollarSign,
  Wallet,
  BellRing,
  Target,
  Settings,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  Landmark,
  Calculator,
  Shield,
  Repeat,
} from "lucide-react"

const inter = Inter({ subsets: ["latin"] })

const navItems = [
  {
    title: "Overview",
    icon: Home,
    items: [{ title: "Dashboard", href: "/dashboard", icon: BarChart3 }],
  },
  {
    title: "Money Management",
    icon: Wallet,
    items: [
      { title: "Accounts", href: "/accounts", icon: CreditCard },
      { title: "Transactions", href: "/transactions", icon: Receipt },
      { title: "Income", href: "/income", icon: TrendingUp },
      { title: "Expenses", href: "/expenses", icon: TrendingDown },
      { title: "Debt Management", href: "/debt-management", icon: CreditCard },
      { title: "Subscriptions", href: "/subscriptions", icon: Repeat },
    ],
  },
  {
    title: "Planning",
    icon: Calendar,
    items: [
      { title: "Budgets", href: "/budgets", icon: PiggyBank },
      { title: "Goals", href: "/goals", icon: Target },
      { title: "Bills", href: "/bills", icon: FileText },
      { title: "Tax Planner", href: "/tax-planner", icon: Calculator },
      { title: "Net Worth", href: "/net-worth", icon: TrendingUp },
    ],
  },
  {
    title: "Investments",
    icon: TrendingUp,
    items: [
      { title: "Portfolio", href: "/investments/portfolio", icon: DollarSign },
      { title: "Watchlist", href: "/investments/watchlist", icon: Clock },
    ],
  },
  {
    title: "Reports & Analytics",
    icon: BarChart3,
    items: [
      { title: "Reports", href: "/reports", icon: BarChart3 },
      { title: "Calendar", href: "/calendar", icon: Calendar },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Notifications", href: "/notifications", icon: BellRing },
    ],
  },
]

import './globals.css'

export const metadata = {
  title: 'DripCheck - Flaunting responsibly',
  description: 'Track your finances and flaunt responsibly with DripCheck',
  generator: 'v0.dev'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
        <Suspense fallback={null}>
          <GoogleTagManager />
          <GoogleAnalytics />
        </Suspense>
        <GTMNoScript />
        {/* Cookie cleaner runs first to fix cookie parsing issues */}
        <CookieCleaner />
        <ClientIdManager />
        {/* Session initializer for cross-tab persistence */}
        <SessionInitializer />
        <Providers>
          {/* Error handler to capture console errors */}
          <ErrorHandler />
          <div className="flex flex-col h-screen">
            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              <div className="container py-6 md:py-8">{children}</div>
            </main>
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  )
}

import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Emergency Fund",
  description: "Build and track your emergency savings.",
}

/**
 * This page has been replaced by the Net Worth tracking feature.
 * Users will be automatically redirected to the new Net Worth page.
 * 
 * The Net Worth feature provides a more comprehensive view of your financial health,
 * including tracking assets, liabilities, and net worth over time.
 */
export default async function EmergencyFundPage() {
  // Redirect to the new Net Worth page
  redirect("/net-worth")
}


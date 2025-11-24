import { Metadata } from "next"
import { ReactNode } from "react"
import { DebtProvider } from "@/lib/debt/debt-context"

export const metadata: Metadata = {
  title: "Debt Management",
  description: "Take control of your debt with our comprehensive suite of debt management tools.",
}

export default function DebtManagementLayout({
  children,
}: {
  children: ReactNode
}) {
  return <DebtProvider>{children}</DebtProvider>
}
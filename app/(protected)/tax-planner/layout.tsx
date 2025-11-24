import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tax Planner",
  description: "Plan and optimize your tax strategy.",
}

export default function TaxPlannerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

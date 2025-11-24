import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Subscription ROI Calculator",
  description: "Analyze the value of your subscriptions based on usage and cost",
}

export default function ROICalculatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

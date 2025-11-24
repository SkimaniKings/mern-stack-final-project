import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Duplicate Service Detection",
  description: "Find overlapping subscriptions and reduce unnecessary costs",
}

export default function DuplicatesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

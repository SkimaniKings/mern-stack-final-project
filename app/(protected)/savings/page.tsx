import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Savings",
  description: "Manage and track your savings goals",
}

export default function SavingsPage() {
  return (
    <div className="container mx-auto">
      <h1 className="mb-4 text-3xl font-bold">Savings</h1>
      <p className="mb-8 text-muted-foreground">Track and manage your savings goals</p>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Your Savings</h2>
        <p>This feature is coming soon. Check back later for updates!</p>
      </div>
    </div>
  )
}


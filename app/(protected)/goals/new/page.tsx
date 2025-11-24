import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { GoalForm } from "@/components/goals/goal-form"
import { Target } from "lucide-react"

export const metadata: Metadata = {
  title: "New Goal",
  description: "Create a new financial goal.",
}

export default async function NewGoalPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Create New Goal"
        text="Set up a new financial goal to track your progress."
      />

      <GoalForm />
    </DashboardShell>
  )
}


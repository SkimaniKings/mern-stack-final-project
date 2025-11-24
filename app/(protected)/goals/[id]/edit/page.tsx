import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { GoalForm } from "@/components/goals/goal-form"
import { getGoalById } from "@/app/actions/goals"
import { Edit } from "lucide-react"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Edit Goal",
  description: "Update your financial goal.",
}

export default async function EditGoalPage({ params }: { params: { id: string } }) {
  // Fetch the goal data
  const { goal, error } = await getGoalById(params.id)
  
  if (error || !goal) {
    notFound()
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Edit Goal"
        text="Update your financial goal details."
      />

      <GoalForm goal={goal} isEditing={true} />
    </DashboardShell>
  )
}

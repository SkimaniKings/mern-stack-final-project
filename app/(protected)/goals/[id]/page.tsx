import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getGoalById } from "@/app/actions/goals"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { GoalDetails } from "@/components/goals/goal-details"

export const metadata: Metadata = {
  title: "Goal Details",
  description: "View and manage your financial goal.",
}

interface GoalPageProps {
  params: {
    id: string
  }
}

export default async function GoalPage({ params }: GoalPageProps) {
  // Properly handle params as a Promise
  const resolvedParams = await Promise.resolve(params)
  const id = resolvedParams?.id

  if (!id) {
    return redirect("/goals")
  }

  try {
    const { goal, error } = await getGoalById(id)

    if (error) {
      console.error(`Error loading goal (${id}):`, error)
      return redirect("/goals")
    }

    if (!goal) {
      console.log(`Goal not found (${id})`)
      return redirect("/goals")
    }

    return (
      <DashboardShell>
        <GoalDetails goal={goal} />
      </DashboardShell>
    )
  } catch (error) {
    console.error(`Unexpected error loading goal (${id}):`, error)
    return redirect("/goals")
  }
}

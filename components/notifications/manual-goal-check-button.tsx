"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { RocketIcon } from "@radix-ui/react-icons"

export function ManualGoalCheckButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleManualCheck = async () => {
    setLoading(true)
    toast.info("Checking for goal notifications...", { id: "goal-check" })
    try {
      const response = await fetch('/api/notifications/goals', { method: 'POST' })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong')
      }

      toast.success(`Notifications created: ${result.notificationsCreated || 0}. Refreshing...`, { id: "goal-check" })
      // Refresh the page to show new notifications
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      toast.error(errorMessage, { id: "goal-check" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleManualCheck} disabled={loading} variant="outline" size="sm">
      <RocketIcon className="mr-2 h-4 w-4" />
      {loading ? "Checking..." : "Manually Check Goal Notifications"}
    </Button>
  )
}

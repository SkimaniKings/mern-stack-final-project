"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { BellIcon } from "@radix-ui/react-icons"

export function ManualBillCheckButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleManualCheck = async () => {
    setLoading(true)
    toast.info("Checking for upcoming bill notifications...", { id: "bill-check" })
    try {
      const response = await fetch('/api/notifications/bills', { method: 'POST' })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong')
      }

      toast.success(`Notifications created: ${result.notificationsCreated || 0}. Refreshing...`, { id: "bill-check" })
      // Refresh the page to show new notifications
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      toast.error(errorMessage, { id: "bill-check" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleManualCheck} disabled={loading} variant="outline" size="sm">
      <BellIcon className="mr-2 h-4 w-4" />
      {loading ? "Checking..." : "Manually Check Bill Alerts"}
    </Button>
  )
}

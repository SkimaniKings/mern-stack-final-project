"use client"

import type React from "react"

import { useState } from "react"
import { createMilestone } from "@/app/actions/goals"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns";

interface AddMilestoneFormProps {
  goalId: string
  onComplete: () => void
}

export function AddMilestoneForm({ goalId, onComplete }: AddMilestoneFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [date, setDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData(event.currentTarget)
      
      if (date) {
        formData.set("target_date", format(date, "yyyy-MM-dd"));
      }

      const result = await createMilestone(goalId, formData)

      if (result.success) {
        onComplete()
      } else if (result.error) {
        setError(result.error)
      }
    } catch (e) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <Input name="name" placeholder="Milestone name" required />
        </div>
        <div>
          <Textarea name="description" placeholder="Description (optional)" rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input name="target_amount" type="number" step="0.01" min="0" placeholder="Target amount ($)" />
          </div>
          <div>
            <Input
              type="date"
              name="target_date"
              value={date ? format(date, "yyyy-MM-dd") : ""}
              onChange={(e) => {
                if (e.target.value) {
                  // Adding T00:00:00 ensures the date is parsed in the local timezone
                  const newDate = new Date(`${e.target.value}T00:00:00`);
                  if (!isNaN(newDate.getTime())) {
                    setDate(newDate);
                  }
                } else {
                  setDate(null);
                }
              }}
              placeholder="Target date"
            />
          </div>
        </div>
        {error && (
          <div className="text-sm text-red-500">
            {error}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Milestone"}
          </Button>
        </div>
      </div>
    </form>
  )
}

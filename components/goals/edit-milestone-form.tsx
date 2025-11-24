"use client"

import type React from "react";
import { useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateMilestone } from "@/app/actions/goals";
import { toast } from "@/components/ui/use-toast";

interface EditMilestoneFormProps {
  milestone: {
    id: string
    name: string
    description?: string
    target_amount?: number
    target_date: string
  }
  onComplete: () => void
  onCancel: () => void
}

export function EditMilestoneForm({ milestone, onComplete, onCancel }: EditMilestoneFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add validation for the date to prevent "Invalid time value" errors
  const getValidDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString || dateString === "null" || dateString === "undefined") {
      return null;
    }
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (e) {
      return null;
    }
  };

  const [date, setDate] = useState<Date | null>(getValidDate(milestone.target_date));
  const [name, setName] = useState(milestone.name)
  const [description, setDescription] = useState(milestone.description || "")
  const [targetAmount, setTargetAmount] = useState(milestone.target_amount?.toString() || "")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set("name", name)
      formData.set("description", description)
      formData.set("target_date", date ? format(date, "yyyy-MM-dd") : "");
      if (targetAmount) {
        formData.set("target_amount", targetAmount)
      }

      const result = await updateMilestone(milestone.id, formData)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Milestone updated successfully!",
      })
      onComplete()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update milestone. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-card">
      <div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Milestone name"
          required
        />
      </div>
      <div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Target amount ($)"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
        </div>
        <div>
          <Input
            type="date"
            value={date ? format(date, "yyyy-MM-dd") : ""}
            onChange={(e) => {
              if (e.target.value) {
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
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Milestone"}
        </Button>
      </div>
    </form>
  )
}

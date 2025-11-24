"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BudgetGoals } from "@/components/budgets/budget-goals"
import { useToast } from "@/hooks/use-toast"
import { createGoal, getGoals, deleteGoal, updateGoal } from "@/app/actions/goals"

type Goal = {
  id?: string
  type: "savings" | "investment" | "debt" | "emergency"
  target: number
  currentProgress: number
  priority: number
  deadline?: Date
  name?: string
  description?: string
  user_id?: string
  created_at?: string
  updated_at?: string
}

export function BudgetGoalsWrapper() {
  const router = useRouter()
  const { toast } = useToast()
  const [goals, setGoals] = useState<Goal[]>([])

  useEffect(() => {
    loadGoals()
  }, [])

  const loadGoals = async () => {
    const { goals: loadedGoals, error } = await getGoals()
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load goals. Please try again.",
        variant: "destructive",
      })
      return
    }
    setGoals(loadedGoals || [])
  }

  const handleAddGoal = async (goal: Omit<Goal, "id">) => {
    try {
      const formData = new FormData()
      formData.append("name", `${goal.type} Goal`)
      formData.append("description", `${goal.type} goal with target ${goal.target}`)
      formData.append("type", goal.type)
      formData.append("target", String(goal.target))
      formData.append("current_progress", String(goal.currentProgress))
      formData.append("priority", goal.priority === 1 ? "high" : goal.priority === 2 ? "medium" : "low")
      formData.append("start_date", new Date().toISOString().split("T")[0])
      if (goal.deadline) {
        formData.append("target_date", goal.deadline.toISOString().split("T")[0])
      }

      const { error } = await createGoal(formData)
      if (error) {
        throw new Error(error)
      }

      await loadGoals()
      toast({
        title: "Goal Added",
        description: `Successfully added new ${goal.type} goal.`,
      })
    } catch (error) {
      console.error("Error adding goal:", error)
      toast({
        title: "Error",
        description: "Failed to add goal. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <BudgetGoals
      goals={goals}
      onAddGoal={handleAddGoal}
    />
  )
}

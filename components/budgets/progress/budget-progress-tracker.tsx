"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"

interface BudgetProgressTrackerProps {
  budgetId: string
  categories: {
    id: string
    name: string
    amount_allocated: number
  }[]
}

interface CategoryProgress {
  id: string
  name: string
  allocated: number
  current: number
  percentage: number
  status: "on_track" | "at_risk" | "over_budget"
  trend: "up" | "down" | "stable"
}

export function BudgetProgressTracker({ budgetId, categories }: BudgetProgressTrackerProps) {
  const [progress, setProgress] = useState<CategoryProgress[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        if (!budgetId || !categories?.length) {
          setProgress([])
          return
        }

        const { data, error } = await supabase
          .from("budget_progress")
          .select("*")
          .eq("budget_id", budgetId)

        if (error) {
          console.error("Error fetching budget progress:", error)
          return
        }

        // Map progress data to categories
        const categoryProgress = categories.map(category => {
          if (!category?.id || !category?.name || typeof category?.amount_allocated !== "number") {
            return null
          }

          const categoryData = data?.find(d => d?.category_id === category.id) || {
            current_amount: 0,
            status: "on_track",
            trend: { direction: "stable" },
          }

          const current = typeof categoryData?.current_amount === "number" ? categoryData.current_amount : 0
          const allocated = category.amount_allocated
          const percentage = allocated > 0 ? (current / allocated) * 100 : 0

          return {
            id: category.id,
            name: category.name,
            allocated,
            current,
            percentage: Math.min(Math.max(percentage, 0), 100),
            status: categoryData?.status || "on_track",
            trend: categoryData?.trend?.direction || "stable",
          }
        }).filter(Boolean) as CategoryProgress[]

        setProgress(categoryProgress)
      } catch (error) {
        console.error("Error processing budget progress:", error)
        setProgress([])
      }
    }

    fetchProgress()

    // Subscribe to progress updates
    const channel = supabase
      .channel("budget_progress")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "budget_progress",
          filter: `budget_id=eq.${budgetId}`,
        },
        () => {
          fetchProgress()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, budgetId, categories])

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "over_budget":
        return "text-destructive"
      case "at_risk":
        return "text-warning"
      case "on_track":
        return "text-success"
      default:
        return "text-muted-foreground"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend?.toLowerCase()) {
      case "up":
        return <ArrowUp className="h-4 w-4 text-destructive" />
      case "down":
        return <ArrowDown className="h-4 w-4 text-success" />
      case "stable":
        return <Minus className="h-4 w-4 text-muted-foreground" />
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress.map((category) => (
          <div key={category.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{category.name || "Unknown Category"}</p>
                <p className="text-sm text-muted-foreground">
                  ${(category.current || 0).toLocaleString()} of ${(category.allocated || 0).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={getStatusColor(category.status)}>
                  {Math.round(category.percentage || 0)}%
                </span>
                {getTrendIcon(category.trend)}
              </div>
            </div>
            <Progress value={category.percentage || 0} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

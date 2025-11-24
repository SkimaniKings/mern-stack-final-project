"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cva } from "class-variance-authority"

// Define the contextual color variants
const cardVariants = cva("transition-colors duration-300", {
  variants: {
    status: {
      good: "bg-green-50 border-green-200",
      caution: "bg-amber-50 border-amber-200",
      danger: "bg-red-50 border-red-200",
      neutral: "bg-white border-gray-200",
    },
  },
  defaultVariants: {
    status: "neutral",
  },
})

const progressVariants = cva("h-2", {
  variants: {
    status: {
      good: "bg-green-500",
      caution: "bg-amber-500",
      danger: "bg-red-500",
      neutral: "bg-blue-500",
    },
  },
  defaultVariants: {
    status: "neutral",
  },
})

const textVariants = cva("", {
  variants: {
    status: {
      good: "text-green-700",
      caution: "text-amber-700",
      danger: "text-red-700",
      neutral: "text-gray-700",
    },
  },
  defaultVariants: {
    status: "neutral",
  },
})

interface ContextualBudgetCardProps {
  title: string
  description: string
  budgeted: number
  actual: number
  formatValue?: (value: number) => string
}

export function ContextualBudgetCard({
  title,
  description,
  budgeted,
  actual,
  formatValue = (value) => `$${value?.toLocaleString() || "0"}`,
}: ContextualBudgetCardProps) {
  // Calculate percentage spent
  const percentSpent = (actual / budgeted) * 100

  // Determine status based on percentage spent
  const getStatus = () => {
    if (percentSpent <= 75) return "good"
    if (percentSpent <= 95) return "caution"
    return "danger"
  }

  const [status, setStatus] = useState(getStatus())
  const [progress, setProgress] = useState(0)

  // Update status when values change
  useEffect(() => {
    setStatus(getStatus())
  }, [actual, budgeted])

  // Animate progress on mount
  useEffect(() => {
    const timer = setTimeout(() => setProgress(Math.min(percentSpent, 100)), 100)
    return () => clearTimeout(timer)
  }, [percentSpent])

  return (
    <Card className={cardVariants({ status })}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{percentSpent > 100 ? "Overspent" : "Spent"}</span>
            <span className={textVariants({ status })}>{percentSpent.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-2" indicatorClassName={progressVariants({ status })} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Spent</p>
            <p className={`text-xl font-medium ${textVariants({ status })}`}>{formatValue(actual)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Budgeted</p>
            <p className="text-xl font-medium">{formatValue(budgeted)}</p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {percentSpent <= 75 && "You're on track with your budget."}
            {percentSpent > 75 && percentSpent <= 95 && "You're approaching your budget limit."}
            {percentSpent > 95 && percentSpent <= 100 && "You've almost reached your budget limit."}
            {percentSpent > 100 && `You're ${formatValue(actual - budgeted)} over budget.`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}


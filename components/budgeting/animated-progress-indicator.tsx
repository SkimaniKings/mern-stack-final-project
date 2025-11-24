"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, TrendingUp, TrendingDown } from "lucide-react"

interface AnimatedProgressIndicatorProps {
  title: string
  description: string
  currentValue: number
  targetValue: number
  startDate: Date
  projectedCompletionDate: Date
  trend: "improving" | "worsening" | "stable"
  valueFormatter?: (value: number) => string
}

export function AnimatedProgressIndicator({
  title,
  description,
  currentValue,
  targetValue,
  startDate,
  projectedCompletionDate,
  trend,
  valueFormatter = (value) => value.toString(),
}: AnimatedProgressIndicatorProps) {
  const [progress, setProgress] = useState(0)

  // Calculate percentage progress
  const percentage = Math.min(Math.round((currentValue / targetValue) * 100), 100)

  // Format dates
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Calculate days remaining
  const daysRemaining = Math.ceil((projectedCompletionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  // Animate progress on mount
  useEffect(() => {
    const timer = setTimeout(() => setProgress(percentage), 100)
    return () => clearTimeout(timer)
  }, [percentage])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge
            variant={trend === "improving" ? "default" : trend === "worsening" ? "destructive" : "outline"}
            className="flex items-center gap-1"
          >
            {trend === "improving" ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === "worsening" ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            {trend === "improving" ? "Improving" : trend === "worsening" ? "Off Track" : "Stable"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current</p>
            <p className="text-xl font-medium">{valueFormatter(currentValue)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Target</p>
            <p className="text-xl font-medium">{valueFormatter(targetValue)}</p>
          </div>
        </div>

        <div className="pt-2 border-t flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>Started: {formatDate(startDate)}</span>
          </div>
          <div className="text-sm font-medium">
            {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Completed"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


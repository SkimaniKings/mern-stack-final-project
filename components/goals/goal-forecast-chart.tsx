"use client"

import { useMemo } from "react"
import { format, addMonths, differenceInMonths } from "date-fns"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, ReferenceLine } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface Goal {
  id: string
  name: string
  description?: string
  category?: string
  target_amount: number
  current_amount: number
  funding_amount?: number
  start_date: string
  target_date: string
  status: string
  priority: string
  is_shared: boolean
}

interface GoalForecastChartProps {
  goal: Goal
}

export function GoalForecastChart({ goal }: GoalForecastChartProps) {
  const chartData = useMemo(() => {
    const startDate = goal.start_date ? new Date(goal.start_date) : new Date()
    const targetDate = goal.target_date ? new Date(goal.target_date) : addMonths(startDate, 12)
    const currentDate = new Date()

    // Calculate months between start and target
    const totalMonths = differenceInMonths(targetDate, startDate) + 1
    const elapsedMonths = differenceInMonths(currentDate, startDate)

    // Calculate ideal monthly contribution
    const idealMonthlyContribution = (goal.target_amount || 0) / totalMonths

    // Calculate current monthly contribution (if funding is set up)
    const currentMonthlyContribution =
      goal.funding_amount || (elapsedMonths > 0 ? (goal.current_amount || 0) / elapsedMonths : idealMonthlyContribution)

    // Generate data points
    const data = []

    // Historical data
    for (let i = 0; i <= elapsedMonths; i++) {
      const date = addMonths(startDate, i)
      const idealAmount = idealMonthlyContribution * i
      const actualAmount = i === elapsedMonths ? (goal.current_amount || 0) : ((goal.current_amount || 0) / elapsedMonths) * i

      data.push({
        date: format(date, "MMM yyyy"),
        ideal: Number.parseFloat(idealAmount.toFixed(2)),
        actual: Number.parseFloat(actualAmount.toFixed(2)),
        projected: null,
      })
    }

    // Projected data
    const monthsRemaining = totalMonths - elapsedMonths
    for (let i = 1; i <= monthsRemaining; i++) {
      const date = addMonths(currentDate, i)
      const monthIndex = elapsedMonths + i
      const idealAmount = idealMonthlyContribution * monthIndex
      const projectedAmount = (goal.current_amount || 0) + currentMonthlyContribution * i

      data.push({
        date: format(date, "MMM yyyy"),
        ideal: Number.parseFloat(idealAmount.toFixed(2)),
        actual: null,
        projected: Number.parseFloat(projectedAmount.toFixed(2)),
      })
    }

    return data
  }, [goal])

  // Calculate if the goal is on track
  const isOnTrack = useMemo(() => {
    if (chartData.length === 0) return false

    const lastDataPoint = chartData[chartData.length - 1]
    return (lastDataPoint.projected || 0) >= goal.target_amount
  }, [chartData, goal])

  // Calculate projected completion date
  const projectedCompletionDate = useMemo(() => {
    if (chartData.length === 0) return null

    // Find the first data point where projected amount exceeds target
    const completionPoint = chartData.find((point) => (point.projected || 0) >= goal.target_amount)

    return completionPoint ? completionPoint.date : "Beyond chart range"
  }, [chartData, goal])

  return (
    <div className="h-full">
      <ChartContainer
        config={{
          ideal: {
            label: "Ideal Progress",
            color: "hsl(var(--chart-1))",
          },
          actual: {
            label: "Actual Progress",
            color: "hsl(var(--chart-2))",
          },
          projected: {
            label: "Projected Progress",
            color: "hsl(var(--chart-3))",
          },
        }}
        className="h-[calc(100%-60px)]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis tickFormatter={(value) => `$${value}`} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <ReferenceLine
              y={goal.target_amount}
              label={{ value: "Target", position: "top" }}
              stroke="red"
              strokeDasharray="3 3"
            />
            <Line
              type="monotone"
              dataKey="ideal"
              stroke="var(--color-ideal)"
              name="Ideal Progress"
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="var(--color-actual)"
              name="Actual Progress"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="var(--color-projected)"
              name="Projected Progress"
              strokeDasharray="3 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="mt-4 text-sm">
        <div className="flex justify-between">
          <div>
            <span className="text-muted-foreground">Status: </span>
            <span className={isOnTrack ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
              {isOnTrack ? "On Track" : "Behind Schedule"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Projected Completion: </span>
            <span className="font-medium">{projectedCompletionDate}</span>
          </div>
        </div>
      </div>
    </div>
  )
}


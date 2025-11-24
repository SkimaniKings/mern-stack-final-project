"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, DonutChart, BarList } from "@tremor/react"
import type { BudgetCategory } from "@/types/budget"

interface VarianceDashboardProps {
  budget: {
    categories: BudgetCategory[]
    totalBudget: number
  }
  actualSpending: {
    [key: string]: number
  }
  historicalData: {
    date: string
    actual: number
    budget: number
  }[]
}

export function VarianceDashboard({ budget, actualSpending, historicalData }: VarianceDashboardProps) {
  // Calculate variance metrics
  const variances = budget.categories.map(category => {
    const actual = actualSpending[category.name] || 0
    const variance = category.amount - actual
    const percentageVariance = (variance / category.amount) * 100
    
    return {
      name: category.name,
      value: Math.abs(variance),
      percentage: percentageVariance,
      status: variance >= 0 ? "positive" : "negative",
    }
  }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

  // Calculate total metrics
  const totalActual = Object.values(actualSpending).reduce((sum, val) => sum + val, 0)
  const totalVariance = budget.totalBudget - totalActual
  const totalPercentageVariance = (totalVariance / budget.totalBudget) * 100

  // Prepare data for charts
  const donutData = variances.map(v => ({
    name: v.name,
    value: v.value,
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Budget Variance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <AreaChart
            data={historicalData}
            index="date"
            categories={["actual", "budget"]}
            colors={["green", "blue"]}
            valueFormatter={(value) => `$${value.toLocaleString()}`}
            className="h-72"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variance Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart
            data={donutData}
            category="value"
            index="name"
            valueFormatter={(value) => `$${value.toLocaleString()}`}
            className="h-72"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Variances</CardTitle>
        </CardHeader>
        <CardContent>
          <BarList
            data={variances.slice(0, 5).map(v => ({
              name: v.name,
              value: v.value,
              color: v.status === "positive" ? "green" : "red",
            }))}
            valueFormatter={(value) => `$${value.toLocaleString()}`}
            className="h-72"
          />
        </CardContent>
      </Card>
    </div>
  )
}

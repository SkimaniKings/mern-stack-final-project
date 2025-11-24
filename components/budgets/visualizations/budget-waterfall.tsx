"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart } from "@tremor/react"
import type { BudgetCategory } from "@/types/budget"

interface BudgetWaterfallProps {
  budget: {
    categories: BudgetCategory[]
    totalBudget: number
  }
  actualSpending: {
    [key: string]: number
  }
}

export function BudgetWaterfall({ budget, actualSpending }: BudgetWaterfallProps) {
  // Transform data for waterfall chart
  const chartData = budget.categories.map(category => {
    const actual = actualSpending[category.name] || 0
    const variance = category.amount - actual
    const status = variance >= 0 ? "Under Budget" : "Over Budget"
    
    return {
      name: category.name,
      Budgeted: category.amount,
      Actual: actual,
      Variance: Math.abs(variance),
      Status: status,
    }
  })

  // Add total row
  const totalActual = Object.values(actualSpending).reduce((sum, val) => sum + val, 0)
  const totalVariance = budget.totalBudget - totalActual
  chartData.push({
    name: "Total",
    Budgeted: budget.totalBudget,
    Actual: totalActual,
    Variance: Math.abs(totalVariance),
    Status: totalVariance >= 0 ? "Under Budget" : "Over Budget",
  })

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Budget vs. Actual Waterfall</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChart
          data={chartData}
          index="name"
          categories={["Budgeted", "Actual", "Variance"]}
          colors={["blue", "green", "red"]}
          valueFormatter={(value) => `$${value.toLocaleString()}`}
          stack={true}
          className="h-72"
        />
      </CardContent>
    </Card>
  )
}

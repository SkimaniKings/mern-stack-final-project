"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/utils/formatting"

interface BudgetCategory {
  name: string
  value: number
  percentage: number
  color: string
}

interface BudgetAllocationChartProps {
  categories?: BudgetCategory[]
  title?: string
  description?: string
  totalBudget?: number
}

export function BudgetAllocationChart({
  categories = [],
  title = "Budget Allocation",
  description = "How your budget is distributed across categories",
  totalBudget = 0,
}: BudgetAllocationChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-3 border rounded-md shadow-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{formatCurrency(data.value)}</p>
          <p className="text-xs text-muted-foreground">{data.percentage.toFixed(1)}% of budget</p>
        </div>
      )
    }
    return null
  }

  // If categories is empty, show a placeholder message
  if (!categories || categories.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <p className="text-muted-foreground">No budget categories available</p>
            <p className="text-sm text-muted-foreground mt-2">Add categories to see your budget allocation</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate top categories safely
  const topCategories = [...categories].sort((a, b) => b.value - a.value).slice(0, 4)

  // Calculate top 3 percentage safely
  const top3Percentage = categories
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3)
    .reduce((sum, cat) => sum + cat.percentage, 0)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  formatter={(value) => <span className="text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Top Categories</p>
              <div className="space-y-1">
                {topCategories.map((category, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                      <p className="text-sm">{category.name}</p>
                    </div>
                    <p className="text-sm font-medium">{formatCurrency(category.value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Budget Health</p>
              <p className="text-sm text-muted-foreground">
                Your top 3 categories account for {top3Percentage.toFixed(1)}% of your budget.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


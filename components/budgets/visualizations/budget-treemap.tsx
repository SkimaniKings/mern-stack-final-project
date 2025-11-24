"use client"

import { ResponsiveTreeMap } from "@nivo/treemap"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BudgetCategory } from "@/types/budget"

interface BudgetTreemapProps {
  budget: {
    categories: BudgetCategory[]
    totalBudget: number
  }
}

function transformToTreemapData(categories: BudgetCategory[]) {
  return {
    name: "Budget",
    children: categories.map(category => ({
      name: category.name,
      value: category.amount,
      color: getColorByPercentage(category.percentage),
      children: category.subcategories?.map(sub => ({
        name: sub.name,
        value: sub.amount,
        color: getColorByPercentage(sub.percentage),
      })),
    })),
  }
}

function getColorByPercentage(percentage: number): string {
  if (percentage > 30) return "#ef4444" // High spending - red
  if (percentage > 15) return "#f97316" // Medium spending - orange
  return "#22c55e" // Low spending - green
}

export function BudgetTreemap({ budget }: BudgetTreemapProps) {
  const data = transformToTreemapData(budget.categories)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Budget Allocation Treemap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveTreeMap
            data={data}
            identity="name"
            value="value"
            valueFormat=">$,.2f"
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            labelSkipSize={12}
            labelTextColor={{ from: "color", modifiers: [["darker", 1.2]] }}
            parentLabelPosition="left"
            parentLabelTextColor={{ from: "color", modifiers: [["darker", 2]] }}
            borderColor={{ from: "color", modifiers: [["darker", 0.1]] }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

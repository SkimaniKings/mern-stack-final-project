"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface OverviewProps {
  data: any[]
  className?: string
}

export function Overview({ data, className }: OverviewProps) {
  // Process data for the chart
  const processedData = processTransactionData(data)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Monthly income and expenses</CardDescription>
      </CardHeader>
      <CardContent className="px-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={processedData}>
            <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Bar dataKey="income" name="Income" fill="#4ade80" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function processTransactionData(transactions: any[]) {
  // Group transactions by month
  const monthlyData = transactions.reduce((acc, transaction) => {
    // Use created_at instead of date
    const date = new Date(transaction.created_at)
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    if (!acc[monthYear]) {
      acc[monthYear] = {
        month: new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString("en-US", { month: "short" }),
        income: 0,
        expenses: 0,
      }
    }

    if (transaction.is_income) {
      acc[monthYear].income += transaction.amount
    } else {
      acc[monthYear].expenses += transaction.amount
    }

    return acc
  }, {})

  // Convert to array and sort by date
  return Object.values(monthlyData).sort((a: any, b: any) => {
    const monthA = new Date(Date.parse(`${a.month} 1, 2000`)).getMonth()
    const monthB = new Date(Date.parse(`${b.month} 1, 2000`)).getMonth()
    return monthA - monthB
  })
}


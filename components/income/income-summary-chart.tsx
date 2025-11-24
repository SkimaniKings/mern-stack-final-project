"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { formatCurrency } from "@/lib/utils"
import type { Income } from "@/app/actions/income"

interface IncomeSummaryChartProps {
  incomes: Income[]
  variant?: "bar" | "pie"
}

export function IncomeSummaryChart({ incomes, variant = "bar" }: IncomeSummaryChartProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [totalMonthly, setTotalMonthly] = useState(0)

  useEffect(() => {
    if (incomes) {
      processData(incomes)
    }
  }, [incomes])

  const processData = (incomes: Income[]) => {
    // Group by category and use monthly_equivalent_amount
    const categoryMap = new Map<string, number>()
    let total = 0

    incomes.forEach((income) => {
      // Use the monthly_equivalent_amount that's already calculated by the database
      const monthlyAmount = income.monthly_equivalent_amount || 0
      
      // Use category name if available, otherwise use "Uncategorized"
      const categoryName = income.category?.name || "Uncategorized"
      const currentAmount = categoryMap.get(categoryName) || 0
      categoryMap.set(categoryName, currentAmount + monthlyAmount)
      total += monthlyAmount
    })

    // Convert map to array for chart
    const data = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round(value * 100) / 100
    }))

    setChartData(data)
    setTotalMonthly(Math.round(total * 100) / 100)
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d']

  if (loading) {
    return <Skeleton className="h-[150px] w-full" />
  }

  if (error) {
    return <div className="text-center text-muted-foreground">{error}</div>
  }

  if (incomes.length === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center text-center">
        <p className="text-muted-foreground">No income entries added yet</p>
      </div>
    )
  }

  if (variant === "pie") {
    return (
      <div className="h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-3xl font-bold">{formatCurrency(totalMonthly)}</div>
      <div className="h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis hide />
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
            <Bar dataKey="value" fill="#0088FE" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


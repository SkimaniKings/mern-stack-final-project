"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getExpensesByPeriod } from "@/app/actions/expenses"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { format, parseISO, subMonths } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp } from "lucide-react"

export function ExpenseMonthlyTrend() {
  const [expenses, setExpenses] = useState<Array<{ period_start: string; period_end: string; total: number; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"6m" | "12m">("6m")

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true)
      try {
        // Get monthly expenses for the last 12 months
        const limit = timeRange === "6m" ? 6 : 12
        const data = await getExpensesByPeriod("month", limit)
        setExpenses(data)
      } catch (error) {
        console.error("Error fetching expense trends:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchExpenses()

    // Listen for expense changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'expense_added' || e.key === 'expense_updated' || e.key === 'expense_deleted') {
        fetchExpenses()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('expense_updated', () => fetchExpenses())
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('expense_updated', () => fetchExpenses())
    }
  }, [timeRange])

  // Format data for the chart
  const chartData = useMemo(() => {
    return expenses.map(expense => ({
      month: format(parseISO(expense.period_start), 'MMM yyyy'),
      total: expense.total,
      count: expense.count,
      periodStart: expense.period_start
    })).reverse() // Reverse to show oldest to newest
  }, [expenses])

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return { value: 0, percentage: 0 }
    
    const currentMonth = chartData[chartData.length - 1]?.total || 0
    const previousMonth = chartData[chartData.length - 2]?.total || 0
    
    if (previousMonth === 0) return { value: currentMonth, percentage: 100 }
    
    const difference = currentMonth - previousMonth
    const percentage = (difference / previousMonth) * 100
    
    return {
      value: difference,
      percentage: percentage
    }
  }, [chartData])

  // Calculate average monthly spending
  const averageSpending = useMemo(() => {
    if (chartData.length === 0) return 0
    const total = chartData.reduce((sum, month) => sum + month.total, 0)
    return total / chartData.length
  }, [chartData])

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-medium">{label}</p>
          <p>{formatCurrency(payload[0].value)}</p>
          <p className="text-xs text-muted-foreground">
            {payload[0].payload.count} expenses
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Trend</CardTitle>
          <CardDescription>Loading expense data...</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="space-y-4 w-full">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Monthly Spending Trend</CardTitle>
          <CardDescription>
            Your spending patterns over time
          </CardDescription>
        </div>
        <Tabs defaultValue="6m" value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="6m">6 Months</TabsTrigger>
            <TabsTrigger value="12m">12 Months</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">No expense data available</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Average</p>
                <p className="text-2xl font-bold">{formatCurrency(averageSpending)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Month-over-Month</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{formatCurrency(Math.abs(trend.value))}</p>
                  {trend.value !== 0 && (
                    <Badge variant={trend.value < 0 ? "success" : "destructive"} className="flex items-center">
                      {trend.value < 0 ? <TrendingDown className="mr-1 h-3 w-3" /> : <TrendingUp className="mr-1 h-3 w-3" />}
                      {Math.abs(trend.percentage).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis 
                    tickFormatter={(value) => `$${value}`}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={averageSpending} stroke="#8884d8" strokeDasharray="3 3" label="Average" />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

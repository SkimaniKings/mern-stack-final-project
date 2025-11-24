"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getExpenses } from "@/app/actions/expenses"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { format, parseISO, getDay } from "date-fns"

export function ExpenseDayAnalysis() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"30d" | "90d" | "1y">("90d")

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true)
      try {
        const data = await getExpenses()
        setExpenses(data)
      } catch (error) {
        console.error("Error fetching expenses:", error)
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
  }, [])

  // Filter expenses by time range
  const filteredExpenses = useMemo(() => {
    if (!expenses.length) return []
    
    const now = new Date()
    let cutoffDate = new Date()
    
    switch (timeRange) {
      case "30d":
        cutoffDate.setDate(now.getDate() - 30)
        break
      case "90d":
        cutoffDate.setDate(now.getDate() - 90)
        break
      case "1y":
        cutoffDate.setFullYear(now.getFullYear() - 1)
        break
    }
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date)
      return expenseDate >= cutoffDate
    })
  }, [expenses, timeRange])

  // Group expenses by day of week
  const dayData = useMemo(() => {
    if (!filteredExpenses.length) return []
    
    // Initialize data for all days of the week
    const days = [
      { name: "Sunday", dayNum: 0, total: 0, count: 0 },
      { name: "Monday", dayNum: 1, total: 0, count: 0 },
      { name: "Tuesday", dayNum: 2, total: 0, count: 0 },
      { name: "Wednesday", dayNum: 3, total: 0, count: 0 },
      { name: "Thursday", dayNum: 4, total: 0, count: 0 },
      { name: "Friday", dayNum: 5, total: 0, count: 0 },
      { name: "Saturday", dayNum: 6, total: 0, count: 0 }
    ]
    
    // Aggregate expenses by day of week
    filteredExpenses.forEach(expense => {
      const expenseDate = new Date(expense.expense_date)
      const dayOfWeek = getDay(expenseDate) // 0 = Sunday, 6 = Saturday
      
      days[dayOfWeek].total += expense.amount
      days[dayOfWeek].count += 1
    })
    
    // Calculate average per day
    days.forEach(day => {
      day.average = day.count > 0 ? day.total / day.count : 0
    })
    
    return days
  }, [filteredExpenses])

  // Find the day with highest spending
  const highestSpendingDay = useMemo(() => {
    if (!dayData.length) return null
    return dayData.reduce((max, day) => day.total > max.total ? day : max, dayData[0])
  }, [dayData])

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
          <p className="text-xs text-muted-foreground">
            Avg: {formatCurrency(payload[0].payload.average)}
          </p>
        </div>
      )
    }
    return null
  }

  // Colors for the bars
  const getBarColor = (dayNum: number) => {
    // Highlight weekends
    if (dayNum === 0 || dayNum === 6) {
      return "#8884d8"
    }
    return "#82ca9d"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Day of Week Analysis</CardTitle>
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
          <CardTitle>Day of Week Analysis</CardTitle>
          <CardDescription>
            When you tend to spend the most
          </CardDescription>
        </div>
        <Tabs defaultValue="90d" value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="30d">30d</TabsTrigger>
            <TabsTrigger value="90d">90d</TabsTrigger>
            <TabsTrigger value="1y">1y</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {filteredExpenses.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">No expense data available</p>
          </div>
        ) : (
          <>
            {highestSpendingDay && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">Highest Spending Day</p>
                <p className="text-2xl font-bold">{highestSpendingDay.name}</p>
                <p className="text-muted-foreground">
                  {formatCurrency(highestSpendingDay.total)} total ({highestSpendingDay.count} expenses)
                </p>
              </div>
            )}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dayData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => `$${value}`}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total Spent">
                    {dayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.dayNum)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

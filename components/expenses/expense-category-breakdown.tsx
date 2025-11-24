"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getExpenses } from "@/app/actions/expenses"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { ALL_CATEGORIES } from "@/lib/constants/categories"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

export function ExpenseCategoryBreakdown() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d")

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
      case "7d":
        cutoffDate.setDate(now.getDate() - 7)
        break
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

  // Group expenses by category
  const categoryData = useMemo(() => {
    if (!filteredExpenses.length) return []
    
    const categoryTotals: Record<string, number> = {}
    
    filteredExpenses.forEach(expense => {
      // Handle expenses with multiple categories
      const categoryIds = expense.category_ids || []
      
      if (categoryIds.length === 0) {
        // If no category, use "Uncategorized"
        categoryTotals["uncategorized"] = (categoryTotals["uncategorized"] || 0) + expense.amount
      } else {
        // Split the expense amount among categories
        const amountPerCategory = expense.amount / categoryIds.length
        
        categoryIds.forEach((categoryId: string) => {
          categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + amountPerCategory
        })
      }
    })
    
    // Convert to array format for chart
    return Object.entries(categoryTotals).map(([categoryId, amount]) => {
      const category = ALL_CATEGORIES.find(c => c.id === categoryId) || {
        id: categoryId,
        name: categoryId === "uncategorized" ? "Uncategorized" : "Unknown",
        color: "#94a3b8" // Default color
      }
      
      return {
        id: categoryId,
        name: category.name,
        value: amount,
        color: category.color
      }
    }).sort((a, b) => b.value - a.value) // Sort by amount (descending)
  }, [filteredExpenses])

  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
  }, [filteredExpenses])

  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p>{formatCurrency(data.value)}</p>
          <p className="text-xs text-muted-foreground">
            {((data.value / totalExpenses) * 100).toFixed(1)}% of total
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
          <CardTitle>Category Breakdown</CardTitle>
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
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>
            How your {formatCurrency(totalExpenses)} in expenses are distributed
          </CardDescription>
        </div>
        <Tabs defaultValue="30d" value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
            <TabsTrigger value="90d">90d</TabsTrigger>
            <TabsTrigger value="1y">1y</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {categoryData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">No expense data available</p>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {categoryData.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Top Categories</h4>
            {categoryData.slice(0, 5).map((category) => (
              <div key={category.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </div>
                <div className="text-sm">
                  {formatCurrency(category.value)} ({((category.value / totalExpenses) * 100).toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

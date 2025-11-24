"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExpensesByPeriod } from "@/app/actions/expenses"
import { format, parseISO, isSameMonth, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { BarChart, TrendingUp, TrendingDown } from "lucide-react"

interface InteractiveTimelineProps {
  className?: string
}

interface TimelineData {
  date: string
  amount: number
  count: number
  categories: {
    [key: string]: {
      name: string
      amount: number
      color: string
    }
  }
}

export function InteractiveTimeline({ className }: InteractiveTimelineProps) {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timelineData, setTimelineData] = useState<TimelineData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<"3m" | "6m" | "1y">("3m")
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [maxAmount, setMaxAmount] = useState(0)
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral')

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true)
      try {
        let period: "day" | "week" | "month" | "year" = "month"
        if (selectedPeriod === "3m" || selectedPeriod === "6m") {
          period = "month"
        } else if (selectedPeriod === "1y") {
          period = "year"
        }
        
        const data = await getExpensesByPeriod(period)
        setExpenses(data)
        
        // Process data for timeline
        const months: TimelineData[] = []
        const now = new Date()
        let monthsToShow = 3
        
        if (selectedPeriod === "6m") {
          monthsToShow = 6
        } else if (selectedPeriod === "1y") {
          monthsToShow = 12
        }
        
        for (let i = 0; i < monthsToShow; i++) {
          const monthDate = subMonths(now, i)
          const start = startOfMonth(monthDate)
          const end = endOfMonth(monthDate)
          
          // Find the expense period that matches this month
          const monthExpenses = data.filter(expensePeriod => {
            try {
              // Parse the period start date
              const periodStartDate = parseISO(expensePeriod.period_start)
              // Check if this period falls within our month
              return isSameMonth(periodStartDate, monthDate)
            } catch (error) {
              console.error("Error parsing date:", error, expensePeriod)
              return false
            }
          })
          
          // Use total from the period data instead of calculating from individual expenses
          const amount = monthExpenses.length > 0 ? monthExpenses[0].total : 0
          
          // Since we don't have category data in the new format, we'll use a simplified approach
          const categories: { [key: string]: { name: string, amount: number, color: string } } = {}
          
          // If we have expense data for this month, create a generic category entry
          if (monthExpenses.length > 0) {
            categories['expenses'] = {
              name: 'Expenses',
              amount: amount,
              color: '#94a3b8'
            }
          }
          
          months.push({
            date: format(start, "yyyy-MM"),
            amount,
            count: monthExpenses.length > 0 ? monthExpenses[0].count : 0,
            categories
          })
        }
        
        // Sort by date (oldest to newest)
        months.sort((a: TimelineData, b: TimelineData) => a.date.localeCompare(b.date))
        
        // Calculate spending trend
        if (months.length >= 2) {
          const currentMonth = months[months.length - 1].amount
          const previousMonth = months[months.length - 2].amount
          
          if (currentMonth > previousMonth) {
            setTrend('up')
          } else if (currentMonth < previousMonth) {
            setTrend('down')
          } else {
            setTrend('neutral')
          }
        }
        
        setTimelineData(months)
        setMaxAmount(Math.max(...months.map(m => m.amount), 1))
      } catch (error) {
        console.error("Error fetching expenses:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchExpenses()
    
    // Set up a listener for when new expenses are added
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
  }, [selectedPeriod])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatMonth = (dateString: string) => {
    return format(parseISO(dateString + "-01"), "MMM yyyy")
  }

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Spending Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Spending Timeline</CardTitle>
          {trend !== 'neutral' && (
            <Badge variant={trend === 'down' ? "success" : "destructive"} className="flex items-center gap-1">
              {trend === 'down' ? (
                <>
                  <TrendingDown className="h-3 w-3" />
                  <span>Spending Down</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-3 w-3" />
                  <span>Spending Up</span>
                </>
              )}
            </Badge>
          )}
        </div>
        <Tabs defaultValue="3m" value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
          <TabsList>
            <TabsTrigger value="3m">3 Months</TabsTrigger>
            <TabsTrigger value="6m">6 Months</TabsTrigger>
            <TabsTrigger value="1y">1 Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-64 relative">
          {timelineData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No spending data available</p>
            </div>
          ) : (
            <>
              <div className="absolute inset-0 flex items-end">
                {timelineData.map((month, i) => {
                  const height = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0
                  const isHovered = hoveredDate === month.date
                  const isSelected = selectedDate === month.date
                  
                  return (
                    <TooltipProvider key={month.date}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="flex-1 flex flex-col items-center justify-end h-full group"
                            onMouseEnter={() => setHoveredDate(month.date)}
                            onMouseLeave={() => setHoveredDate(null)}
                            onClick={() => setSelectedDate(isSelected ? null : month.date)}
                          >
                            <div className="w-full px-1">
                              <div 
                                className={cn(
                                  "w-full rounded-t-sm transition-all duration-200",
                                  isHovered || isSelected ? "bg-primary" : "bg-primary/60 group-hover:bg-primary/80",
                                )}
                                style={{ height: `${Math.max(height, 2)}%` }}
                              />
                            </div>
                            <div className={cn(
                              "text-xs mt-2 text-center transition-colors",
                              isHovered || isSelected ? "text-primary font-medium" : "text-muted-foreground"
                            )}>
                              {formatMonth(month.date)}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">{formatMonth(month.date)}</p>
                            <p className="text-sm">{formatCurrency(month.amount)}</p>
                            <p className="text-xs text-muted-foreground">{month.count} expenses</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                })}
              </div>
              
              {selectedDate && (
                <div className="mt-8 pt-4 border-t">
                  <h3 className="font-medium mb-2">
                    {formatMonth(selectedDate)} Details
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      const selectedMonth = timelineData.find(m => m.date === selectedDate)
                      if (!selectedMonth) return null
                      
                      return Object.entries(selectedMonth.categories).map(([id, category]) => (
                        <div key={id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.name}</span>
                          </div>
                          <span>{formatCurrency(category.amount)}</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

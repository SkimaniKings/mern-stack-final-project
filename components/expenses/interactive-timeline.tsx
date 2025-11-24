"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExpensesByPeriod } from "@/app/actions/expenses"
import { format, parseISO, isSameMonth, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { BarChartIcon, LineChartIcon, TrendingUp, TrendingDown } from "lucide-react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

interface InteractiveTimelineProps {
  className?: string
}

interface TimelineData {
  date: string
  amount: number
  count: number
  month: string
  categories: {
    [key: string]: {
      name: string
      amount: number
      color: string
    }
  }
}

type ChartType = 'bar' | 'line'

export function InteractiveTimeline({ className }: InteractiveTimelineProps) {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timelineData, setTimelineData] = useState<TimelineData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<"3m" | "6m" | "1y">("3m")
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [maxAmount, setMaxAmount] = useState(0)
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [averageSpending, setAverageSpending] = useState(0)

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
            month: format(start, "MMM yyyy"),
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
        
        // Calculate average spending
        const totalSpending = months.reduce((sum, month) => sum + month.amount, 0)
        const avg = months.length > 0 ? totalSpending / months.length : 0
        setAverageSpending(avg)
        
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
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md p-1">
            <button 
              onClick={() => setChartType('bar')} 
              className={cn(
                "p-1 rounded", 
                chartType === 'bar' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              title="Bar Chart"
            >
              <BarChartIcon className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setChartType('line')} 
              className={cn(
                "p-1 rounded", 
                chartType === 'line' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              title="Line Chart"
            >
              <LineChartIcon className="h-4 w-4" />
            </button>
          </div>
          <Tabs defaultValue="3m" value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
            <TabsList>
              <TabsTrigger value="3m">3 Months</TabsTrigger>
              <TabsTrigger value="6m">6 Months</TabsTrigger>
              <TabsTrigger value="1y">1 Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 relative">
          {timelineData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No spending data available</p>
            </div>
          ) : (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart
                      data={timelineData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      onClick={(data) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          const clickedData = data.activePayload[0].payload as TimelineData;
                          setSelectedDate(selectedDate === clickedData.date ? null : clickedData.date);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`$${value}`, 'Spending']}
                        labelFormatter={(label) => `${label}`}
                      />
                      <ReferenceLine 
                        y={averageSpending} 
                        stroke="#888" 
                        strokeDasharray="3 3"
                        label={{ value: 'Avg', position: 'right', fill: '#888', fontSize: 10 }}
                      />
                      <Bar 
                        dataKey="amount" 
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        animationDuration={500}
                      />
                    </BarChart>
                  ) : (
                    <LineChart
                      data={timelineData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      onClick={(data) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          const clickedData = data.activePayload[0].payload as TimelineData;
                          setSelectedDate(selectedDate === clickedData.date ? null : clickedData.date);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`$${value}`, 'Spending']}
                        labelFormatter={(label) => `${label}`}
                      />
                      <ReferenceLine 
                        y={averageSpending} 
                        stroke="#888" 
                        strokeDasharray="3 3"
                        label={{ value: 'Avg', position: 'right', fill: '#888', fontSize: 10 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#3b82f6" }}
                        activeDot={{ r: 6, fill: "#2563eb" }}
                        animationDuration={500}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
              
              {selectedDate && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-medium mb-2">
                    {formatMonth(selectedDate)} Details
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      const selectedMonth = timelineData.find(m => m.date === selectedDate)
                      if (!selectedMonth) return null
                      
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Total Spending:</span>
                            <span className="font-semibold">{formatCurrency(selectedMonth.amount)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Number of Expenses:</span>
                            <span>{selectedMonth.count}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Average per Expense:</span>
                            <span>{selectedMonth.count > 0 ? formatCurrency(selectedMonth.amount / selectedMonth.count) : '$0.00'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Compared to Average:</span>
                            <div className="flex items-center gap-1">
                              {selectedMonth.amount > averageSpending ? (
                                <>
                                  <TrendingUp className="h-3 w-3 text-destructive" />
                                  <span className="text-destructive">{formatCurrency(selectedMonth.amount - averageSpending)} above avg</span>
                                </>
                              ) : selectedMonth.amount < averageSpending ? (
                                <>
                                  <TrendingDown className="h-3 w-3 text-success" />
                                  <span className="text-success">{formatCurrency(averageSpending - selectedMonth.amount)} below avg</span>
                                </>
                              ) : (
                                <span>At average</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
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

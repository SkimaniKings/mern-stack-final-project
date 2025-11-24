"use client"

import { useState, useEffect } from "react"
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns"
import { ChevronLeft, ChevronRight, BarChart, PieChart, LineChart, ArrowUpRight, ArrowDownRight, RepeatIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency } from "@/lib/utils"
import { getAnalyticsCalendarData, AnalyticsDayData, AnalyticsEvent } from "@/app/actions/analytics-calendar"
import { Report } from "@/app/actions/reports"

interface AnalyticsCalendarProps {
  className?: string
}

export function AnalyticsCalendar({ className }: AnalyticsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDayData[]>([])
  const [loading, setLoading] = useState(true)

  // Load data when component mounts or month changes
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Get analytics data for the current month
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth() + 1 // JavaScript months are 0-indexed
        const data = await getAnalyticsCalendarData(year, month)
        setAnalyticsData(data)
      } catch (error) {
        console.error("Error loading analytics calendar data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [currentDate])

  // Get the first day of the current month
  const firstDayCurrentMonth = startOfMonth(currentDate)

  // Get all days in the current month
  const days = eachDayOfInterval({
    start: firstDayCurrentMonth,
    end: endOfMonth(currentDate),
  })

  // Function to go to previous month
  const previousMonth = () => {
    const firstDayPreviousMonth = addDays(firstDayCurrentMonth, -1)
    setCurrentDate(startOfMonth(firstDayPreviousMonth))
  }

  // Function to go to next month
  const nextMonth = () => {
    const firstDayNextMonth = addDays(endOfMonth(currentDate), 1)
    setCurrentDate(startOfMonth(firstDayNextMonth))
  }

  // Function to get analytics data for a specific day
  const getDayData = (day: Date): AnalyticsDayData | undefined => {
    const dateStr = format(day, "yyyy-MM-dd")
    return analyticsData.find((data) => data.date === dateStr)
  }

  // Function to get report icon based on format
  const getReportIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <LineChart className="h-3 w-3 text-blue-500" />
      case 'csv':
        return <BarChart className="h-3 w-3 text-green-500" />
      case 'excel':
        return <PieChart className="h-3 w-3 text-purple-500" />
      default:
        return <BarChart className="h-3 w-3 text-gray-500" />
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Analytics Calendar</CardTitle>
          <CardDescription>Track your financial activities and reports</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={previousMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">{format(currentDate, "MMMM yyyy")}</div>
          <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Loading calendar data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((day) => {
              const dayData = getDayData(day)
              const hasReports = dayData?.events?.some(event => event.type === "report")
              const hasIncome = dayData?.income && dayData.income > 0
              const hasExpenses = dayData?.expenses && dayData.expenses > 0
              const hasRecurringExpenses = dayData?.events?.some(event => event.isRecurring === true)
              
              return (
                <TooltipProvider key={day.toString()}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "aspect-square p-1",
                          !isSameMonth(day, currentDate) && "opacity-50",
                          isToday(day) && "bg-primary/10 rounded-md",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-full flex-col justify-between rounded-md p-1", 
                            dayData && "bg-muted/50",
                            hasReports && "border-t-2 border-blue-500",
                            hasIncome && "border-l-2 border-green-500",
                            hasExpenses && "border-r-2 border-red-500",
                            hasRecurringExpenses && "border-b-2 border-purple-500"
                          )}
                        >
                          <div className="text-right text-xs">{format(day, "d")}</div>
                          <div className="mt-auto flex flex-col gap-0.5">
                            {hasReports && (
                              <div className="flex items-center justify-end gap-0.5 text-[10px] text-blue-500">
                                <BarChart className="h-2.5 w-2.5" />
                                <span>{dayData?.events?.filter(e => e.type === "report").length}</span>
                              </div>
                            )}
                            {hasIncome && (
                              <div className="flex items-center justify-end gap-0.5 text-[10px] text-green-500">
                                <ArrowUpRight className="h-2.5 w-2.5" />
                                <span>{formatCurrency(dayData?.income || 0)}</span>
                              </div>
                            )}
                            {hasExpenses && (
                              <div className="flex items-center justify-end gap-0.5 text-[10px] text-red-500">
                                <ArrowDownRight className="h-2.5 w-2.5" />
                                <span>{formatCurrency(dayData?.expenses || 0)}</span>
                              </div>
                            )}
                            {hasRecurringExpenses && (
                              <div className="flex items-center justify-end gap-0.5 text-[10px] text-purple-500">
                                <RepeatIcon className="h-2.5 w-2.5" />
                                <span>{dayData?.events?.filter(e => e.isRecurring === true).length}</span>
                              </div>
                            )}
                            {!hasReports && !hasIncome && !hasExpenses && (
                              <div className="h-2.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    {dayData && (
                      <TooltipContent className="w-64 p-0">
                        <Card className="border-0 shadow-none">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{format(day, "MMMM d, yyyy")}</CardTitle>
                          </CardHeader>
                          <CardContent className="pb-3">
                            {dayData.events && dayData.events.length > 0 ? (
                              <div className="space-y-2">
                                {/* Reports section */}
                                {dayData.events.filter(e => e.type === "report").length > 0 && (
                                  <div className="mb-2">
                                    <h4 className="text-xs font-medium mb-1">Reports</h4>
                                    {dayData.events
                                      .filter(event => event.type === "report")
                                      .map((event) => (
                                        <div key={event.id} className="flex items-center justify-between text-sm">
                                          <div className="flex items-center gap-2">
                                            {getReportIcon(event.format || 'pdf')}
                                            <span className="text-xs">{event.title}</span>
                                          </div>
                                          <span className="text-xs font-medium text-blue-500">
                                            {event.format?.toUpperCase()}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                )}
                                
                                {/* Financial activities section */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-medium mb-1">Financial Activities</h4>
                                  {dayData.events
                                    .filter(event => event.type !== "report")
                                    .map((event) => (
                                      <div key={event.id} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                          {event.type === "income" && <ArrowUpRight className="h-3 w-3 text-green-500" />}
                                          {event.type === "expense" && !event.isRecurring && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                                          {event.type === "expense" && event.isRecurring && <RepeatIcon className="h-3 w-3 text-purple-500" />}
                                          <span className="text-xs">{event.title}</span>
                                        </div>
                                        <span
                                          className={cn(
                                            "text-xs font-medium",
                                            event.type === "income" ? "text-green-500" : 
                                            event.isRecurring ? "text-purple-500" : "text-red-500"
                                          )}
                                        >
                                          {event.type === "income" ? "+" : "-"}{formatCurrency(event.amount)}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">No activities on this day.</div>
                            )}
                          </CardContent>
                        </Card>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

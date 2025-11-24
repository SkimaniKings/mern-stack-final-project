"use client"

import { useState, useEffect } from "react"
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns"
import { ChevronLeft, ChevronRight, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { WidgetLayout } from "@/components/dashboard/widget-layout"
import { formatCurrency } from "@/lib/utils/formatting"
import type { FinancialCalendarData } from "@/app/actions/transactions"

// Types for financial day data
interface FinancialDayData {
  date: Date
  income?: number
  expenses?: number
  events?: Array<{
    id: string
    title: string
    amount: number
    type: "income" | "expense"
  }>
}

interface FinancialCalendarProps {
  className?: string
  initialData?: FinancialCalendarData[]
}

export function FinancialCalendar({ className, initialData = [] }: FinancialCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [financialData, setFinancialData] = useState<FinancialDayData[]>([])

  // Convert initialData to the format expected by the component
  useEffect(() => {
    if (initialData.length > 0) {
      const convertedData = initialData.map(item => ({
        date: new Date(item.date),
        income: item.income || 0,
        expenses: item.expenses || 0,
        events: item.events
      }))
      setFinancialData(convertedData)
    }
  }, [initialData])

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

  // Function to get financial data for a specific day
  const getDayData = (day: Date): FinancialDayData | undefined => {
    return financialData.find((data) => format(data.date, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"))
  }

  return (
    <WidgetLayout className={className} title="Financial Calendar">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Financial Calendar</CardTitle>
          <CardDescription>Track your daily financial activities</CardDescription>
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
                          dayData?.income && dayData.income > 0 && "border-l-2 border-green-500",
                          dayData?.expenses && dayData.expenses > 0 && "border-r-2 border-red-500"
                        )}
                      >
                        <div className="text-right text-xs">{format(day, "d")}</div>
                        <DayContent dayData={dayData} />
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
                              {dayData.events.map((event) => (
                                <div key={event.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    {event.type === "income" ? (
                                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                                    )}
                                    <span>{event.title}</span>
                                  </div>
                                  <span
                                    className={cn(
                                      "font-medium",
                                      event.type === "income" ? "text-green-500" : "text-red-500",
                                    )}
                                  >
                                    {event.type === "income" ? "+" : "-"}{formatCurrency(event.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No financial activities on this day.</div>
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
      </CardContent>
    </WidgetLayout>
  )
}

// Component to display day content with proper null checks
function DayContent({ dayData }: { dayData?: FinancialDayData }) {
  // Return empty div if no data is available
  if (!dayData) {
    return <div className="mt-auto" />
  }

  const hasIncome = dayData.income && dayData.income > 0
  const hasExpenses = dayData.expenses && dayData.expenses > 0

  return (
    <div className="mt-auto flex flex-col gap-0.5">
      {hasIncome && (
        <div className="flex items-center justify-end gap-0.5 text-[10px] text-green-500">
          <DollarSign className="h-2.5 w-2.5" />
          <span>{formatCurrency(dayData.income || 0)}</span>
        </div>
      )}
      {hasExpenses && (
        <div className="flex items-center justify-end gap-0.5 text-[10px] text-red-500">
          <DollarSign className="h-2.5 w-2.5" />
          <span>{formatCurrency(dayData.expenses || 0)}</span>
        </div>
      )}
      {!hasIncome && !hasExpenses && (
        <div className="flex items-center justify-end gap-0.5 text-[10px] text-muted-foreground">
          <span>0</span>
        </div>
      )}
    </div>
  )
}

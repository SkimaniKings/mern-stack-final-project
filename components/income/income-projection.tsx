"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import type { IncomeSource, IncomeEvent } from "@/types/income"
import { supabase } from "@/lib/supabase"
import { CalendarIcon, AlertCircle } from "lucide-react"
import { format, addMonths, addYears, parseISO, isAfter, isBefore, isEqual } from "date-fns"

// Mock user ID since authentication is disabled
const MOCK_USER_ID = "123e4567-e89b-12d3-a456-426614174000"

export function IncomeProjection() {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [incomeEvents, setIncomeEvents] = useState<IncomeEvent[]>([])
  const [projectionData, setProjectionData] = useState<any[]>([])
  const [timeframe, setTimeframe] = useState<string>("1year")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch income sources
        const { data: sourcesData, error: sourcesError } = await supabase
          .from("income_sources")
          .select("*")
          .eq("user_id", MOCK_USER_ID)

        if (sourcesError) throw sourcesError

        // Fetch income events
        const { data: eventsData, error: eventsError } = await supabase
          .from("income_events")
          .select("*")
          .eq("user_id", MOCK_USER_ID)

        if (eventsError) throw eventsError

        setIncomeSources(sourcesData || [])
        setIncomeEvents(eventsData || [])
      } catch (error) {
        console.error("Error fetching income data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (incomeSources.length === 0) return

    generateProjection()
  }, [incomeSources, incomeEvents, timeframe])

  const generateProjection = () => {
    const now = new Date()
    let endDate: Date

    switch (timeframe) {
      case "3months":
        endDate = addMonths(now, 3)
        break
      case "6months":
        endDate = addMonths(now, 6)
        break
      case "1year":
        endDate = addYears(now, 1)
        break
      case "3years":
        endDate = addYears(now, 3)
        break
      case "5years":
        endDate = addYears(now, 5)
        break
      default:
        endDate = addYears(now, 1)
    }

    // Generate monthly data points
    const dataPoints: any[] = []
    let currentDate = now

    while (isBefore(currentDate, endDate) || isEqual(currentDate, endDate)) {
      const monthData = {
        date: format(currentDate, "MMM yyyy"),
        timestamp: currentDate.getTime(),
        total: 0,
        events: [] as IncomeEvent[],
      }

      // Add income from each source for this month
      incomeSources.forEach((source) => {
        // Check if source is active for this month
        const sourceStartDate = source.start_date ? parseISO(source.start_date) : null
        const sourceEndDate = source.end_date ? parseISO(source.end_date) : null

        if (
          (!sourceStartDate || isAfter(currentDate, sourceStartDate) || isEqual(currentDate, sourceStartDate)) &&
          (!sourceEndDate || isBefore(currentDate, sourceEndDate) || isEqual(currentDate, sourceEndDate))
        ) {
          // Calculate monthly amount based on frequency
          let monthlyAmount = source.amount
          switch (source.frequency) {
            case "annually":
              monthlyAmount /= 12
              break
            case "quarterly":
              monthlyAmount /= 3
              break
            case "bi-weekly":
              monthlyAmount *= 26 / 12 // 26 bi-weekly periods per year
              break
            case "weekly":
              monthlyAmount *= 52 / 12 // 52 weeks per year
              break
            case "daily":
              monthlyAmount *= 365 / 12 // 365 days per year
              break
            case "one-time":
              // Only include in the specific month
              const sourceDate = sourceStartDate || now
              if (
                sourceDate.getMonth() === currentDate.getMonth() &&
                sourceDate.getFullYear() === currentDate.getFullYear()
              ) {
                // Include one-time payment
              } else {
                monthlyAmount = 0
              }
              break
          }

          // Add to total
          monthData.total += monthlyAmount

          // Add source-specific data
          monthData[`source_${source.id}`] = monthlyAmount
          monthData[`${source.name.replace(/\s+/g, "_")}`] = monthlyAmount
        }
      })

      // Add income events for this month
      incomeEvents.forEach((event) => {
        const eventDate = parseISO(event.date)

        // Check if event occurs in this month
        if (eventDate.getMonth() === currentDate.getMonth() && eventDate.getFullYear() === currentDate.getFullYear()) {
          // Add event amount to total
          monthData.total += event.amount

          // Add event to the list
          monthData.events.push(event)
        }

        // Handle recurring events
        if (event.is_recurring && event.recurrence_pattern) {
          // Simple recurrence handling for demo
          if (event.recurrence_pattern === "annual") {
            // Check if this is the anniversary month
            if (
              eventDate.getMonth() === currentDate.getMonth() &&
              eventDate.getFullYear() < currentDate.getFullYear()
            ) {
              // Add recurring event amount
              monthData.total += event.amount

              // Add event to the list with modified date
              const recurringEvent = { ...event, date: format(currentDate, "yyyy-MM-dd") }
              monthData.events.push(recurringEvent)
            }
          }
        }
      })

      dataPoints.push(monthData)
      currentDate = addMonths(currentDate, 1)
    }

    setProjectionData(dataPoints)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income Timeline Projection</CardTitle>
          <CardDescription>Loading your income projection...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <div className="h-40 w-full animate-pulse rounded-md bg-muted"></div>
        </CardContent>
      </Card>
    )
  }

  if (incomeSources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income Timeline Projection</CardTitle>
          <CardDescription>Visualize your future income growth</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-10">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            No income sources found. Add income sources to see your projection.
          </p>
          <Button className="mt-4" asChild>
            <a href="/income/sources/new">Add Income Source</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Calculate total projected income
  const totalProjected = projectionData.reduce((sum, month) => sum + month.total, 0)

  // Calculate average monthly income
  const avgMonthlyIncome = totalProjected / projectionData.length

  // Find months with significant events
  const significantMonths = projectionData
    .filter((month) => month.events.length > 0)
    .map((month) => ({
      date: month.date,
      events: month.events.map((event: IncomeEvent) => event.name).join(", "),
    }))

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Income Timeline Projection</CardTitle>
            <CardDescription>Visualize your future income growth</CardDescription>
          </div>
          <div className="mt-2 sm:mt-0">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
                <SelectItem value="3years">3 Years</SelectItem>
                <SelectItem value="5years">5 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={projectionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value) => `$${value.toLocaleString()}`}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                name="Total Income"
                stroke="#8884d8"
                strokeWidth={2}
                activeDot={{ r: 8 }}
              />

              {/* Add lines for each income source */}
              {incomeSources.map((source, index) => (
                <Line
                  key={source.id}
                  type="monotone"
                  dataKey={source.name.replace(/\s+/g, "_")}
                  name={source.name}
                  stroke={`hsl(${(index * 30) % 360}, 70%, 50%)`}
                  strokeDasharray="5 5"
                />
              ))}

              {/* Add reference lines for significant events */}
              {incomeEvents.map((event) => {
                const eventDate = parseISO(event.date)
                const matchingDataPoint = projectionData.find((point) => point.date === format(eventDate, "MMM yyyy"))

                if (matchingDataPoint) {
                  return (
                    <ReferenceLine
                      key={event.id}
                      x={matchingDataPoint.date}
                      stroke="red"
                      label={{
                        value: event.name,
                        position: "insideTopRight",
                        fill: "red",
                        fontSize: 12,
                      }}
                    />
                  )
                }
                return null
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">Total Projected Income</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">${totalProjected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Over the next{" "}
                {timeframe === "3months"
                  ? "3 months"
                  : timeframe === "6months"
                    ? "6 months"
                    : timeframe === "1year"
                      ? "year"
                      : timeframe === "3years"
                        ? "3 years"
                        : "5 years"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">Average Monthly Income</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">${avgMonthlyIncome.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Expected monthly average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">Income Growth</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {projectionData.length >= 2 ? (
                <>
                  <div className="text-2xl font-bold">
                    {((projectionData[projectionData.length - 1].total / projectionData[0].total - 1) * 100).toFixed(1)}
                    %
                  </div>
                  <p className="text-xs text-muted-foreground">Projected growth over period</p>
                </>
              ) : (
                <div className="text-muted-foreground">Insufficient data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {significantMonths.length > 0 && (
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">Upcoming Income Events</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                {significantMonths.map((month, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CalendarIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{month.date}</p>
                      <p className="text-sm text-muted-foreground">{month.events}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}


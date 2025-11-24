"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts"
import type { IncomeSource, SideHustleActivity } from "@/types/income"
import { supabase } from "@/lib/supabase"
import { Clock, DollarSign, TrendingUp, AlertCircle, BarChart2 } from "lucide-react"
import { format, parseISO, subMonths } from "date-fns"

// Mock user ID since authentication is disabled
const MOCK_USER_ID = "123e4567-e89b-12d3-a456-426614174000"

export function SideHustleDashboard() {
  const [sideHustles, setSideHustles] = useState<IncomeSource[]>([])
  const [activities, setActivities] = useState<SideHustleActivity[]>([])
  const [selectedHustle, setSelectedHustle] = useState<string>("all")
  const [timeframe, setTimeframe] = useState<string>("6months")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch side hustle income sources
        const { data: sourcesData, error: sourcesError } = await supabase
          .from("income_sources")
          .select("*")
          .eq("user_id", MOCK_USER_ID)
          .eq("type", "side-hustle")

        if (sourcesError) throw sourcesError

        // Fetch side hustle activities
        const { data: activitiesData, error: activitiesError } = await supabase
          .from("side_hustle_activities")
          .select("*")
          .eq("user_id", MOCK_USER_ID)

        if (activitiesError) throw activitiesError

        setSideHustles(sourcesData || [])
        setActivities(activitiesData || [])
      } catch (error) {
        console.error("Error fetching side hustle data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter activities based on selected hustle and timeframe
  const filteredActivities = activities.filter((activity) => {
    const activityDate = parseISO(activity.date)
    const now = new Date()
    let startDate: Date

    // Filter by timeframe
    switch (timeframe) {
      case "1month":
        startDate = subMonths(now, 1)
        break
      case "3months":
        startDate = subMonths(now, 3)
        break
      case "6months":
        startDate = subMonths(now, 6)
        break
      case "1year":
        startDate = subMonths(now, 12)
        break
      default:
        startDate = subMonths(now, 6)
    }

    // Filter by hustle
    return activityDate >= startDate && (selectedHustle === "all" || activity.income_source_id === selectedHustle)
  })

  // Group activities by month
  const activitiesByMonth = filteredActivities.reduce(
    (acc, activity) => {
      const month = format(parseISO(activity.date), "MMM yyyy")

      if (!acc[month]) {
        acc[month] = {
          month,
          earnings: 0,
          expenses: 0,
          profit: 0,
          hours: 0,
          activities: [],
        }
      }

      acc[month].earnings += activity.amount_earned
      acc[month].expenses += activity.expenses
      acc[month].profit += activity.amount_earned - activity.expenses
      acc[month].hours += activity.hours_worked || 0
      acc[month].activities.push(activity)

      return acc
    },
    {} as Record<string, any>,
  )

  // Convert to array and sort by date
  const monthlyData = Object.values(activitiesByMonth).sort((a, b) => {
    return new Date(a.month).getTime() - new Date(b.month).getTime()
  })

  // Calculate totals and averages
  const totalEarnings = filteredActivities.reduce((sum, activity) => sum + activity.amount_earned, 0)
  const totalExpenses = filteredActivities.reduce((sum, activity) => sum + activity.expenses, 0)
  const totalProfit = totalEarnings - totalExpenses
  const totalHours = filteredActivities.reduce((sum, activity) => sum + (activity.hours_worked || 0), 0)
  const hourlyRate = totalHours > 0 ? totalProfit / totalHours : 0

  // Prepare data for hourly rate analysis
  const hourlyRateData = filteredActivities
    .filter((activity) => activity.hours_worked && activity.hours_worked > 0)
    .map((activity) => ({
      date: format(parseISO(activity.date), "MMM d, yyyy"),
      hours: activity.hours_worked,
      earnings: activity.amount_earned - activity.expenses,
      hourlyRate: (activity.amount_earned - activity.expenses) / (activity.hours_worked || 1),
      source: sideHustles.find((hustle) => hustle.id === activity.income_source_id)?.name || "Unknown",
    }))

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Side Hustle Dashboard</CardTitle>
          <CardDescription>Loading your side hustle data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <div className="h-40 w-full animate-pulse rounded-md bg-muted"></div>
        </CardContent>
      </Card>
    )
  }

  if (sideHustles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Side Hustle Dashboard</CardTitle>
          <CardDescription>Track your gig economy and passive income streams</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-10">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            No side hustles found. Add side hustle income sources to get started.
          </p>
          <Button className="mt-4" asChild>
            <a href="/income/sources/new">Add Side Hustle</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Side Hustle Dashboard</CardTitle>
            <CardDescription>Track your gig economy and passive income streams</CardDescription>
          </div>
          <div className="mt-2 flex flex-col space-y-2 sm:mt-0 sm:flex-row sm:space-x-2 sm:space-y-0">
            <Select value={selectedHustle} onValueChange={setSelectedHustle}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select side hustle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Side Hustles</SelectItem>
                {sideHustles.map((hustle) => (
                  <SelectItem key={hustle.id} value={hustle.id}>
                    {hustle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-green-500" />
                <div className="text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
              </div>
              <p className="text-xs text-muted-foreground">Gross earnings before expenses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-blue-500" />
                <div className="text-2xl font-bold">${totalProfit.toLocaleString()}</div>
              </div>
              <p className="text-xs text-muted-foreground">After ${totalExpenses.toLocaleString()} in expenses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">Hours Worked</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-orange-500" />
                <div className="text-2xl font-bold">{totalHours.toLocaleString()}</div>
              </div>
              <p className="text-xs text-muted-foreground">Total hours tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium">Hourly Rate</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-purple-500" />
                <div className="text-2xl font-bold">${hourlyRate.toFixed(2)}</div>
              </div>
              <p className="text-xs text-muted-foreground">Average earnings per hour</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="earnings">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="hours">Hours & Efficiency</TabsTrigger>
            <TabsTrigger value="comparison">Side Hustle Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="pt-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Monthly Earnings Breakdown</CardTitle>
                <CardDescription>Track your side hustle income over time</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="earnings" name="Gross Earnings" stackId="a" fill="#8884d8" />
                    <Bar dataKey="expenses" name="Expenses" stackId="a" fill="#82ca9d" />
                    <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#ff7300" strokeWidth={2} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours" className="pt-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Hourly Rate Analysis</CardTitle>
                <CardDescription>Analyze your earnings efficiency</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hours"
                      name="Hours Worked"
                      label={{ value: "Hours Worked", position: "insideBottomRight", offset: -5 }}
                    />
                    <YAxis
                      dataKey="earnings"
                      name="Earnings"
                      label={{ value: "Earnings ($)", angle: -90, position: "insideLeft" }}
                    />
                    <ZAxis dataKey="hourlyRate" range={[50, 500]} name="Hourly Rate" />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value, name) => [
                        name === "Earnings" ? `$${value}` : name === "Hours Worked" ? `${value} hrs` : `$${value}/hr`,
                        name,
                      ]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Scatter name="Side Hustle Activities" data={hourlyRateData} fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
              <CardFooter className="p-4">
                <p className="text-sm text-muted-foreground">
                  Bubble size represents hourly rate. Larger bubbles indicate more efficient use of your time.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="pt-4">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Side Hustle Comparison</CardTitle>
                <CardDescription>Compare performance across different side hustles</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {sideHustles.length > 1 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={sideHustles.map((hustle) => {
                        const hustleActivities = activities.filter(
                          (activity) => activity.income_source_id === hustle.id,
                        )

                        const totalEarned = hustleActivities.reduce((sum, activity) => sum + activity.amount_earned, 0)

                        const totalExpenses = hustleActivities.reduce((sum, activity) => sum + activity.expenses, 0)

                        const totalHours = hustleActivities.reduce(
                          (sum, activity) => sum + (activity.hours_worked || 0),
                          0,
                        )

                        return {
                          name: hustle.name,
                          earnings: totalEarned,
                          expenses: totalExpenses,
                          profit: totalEarned - totalExpenses,
                          hours: totalHours,
                          hourlyRate: totalHours > 0 ? (totalEarned - totalExpenses) / totalHours : 0,
                        }
                      })}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#ff7300" />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "hourlyRate" ? `$${Number(value).toFixed(2)}` : `$${Number(value).toLocaleString()}`,
                          name === "hourlyRate" ? "Hourly Rate" : name.charAt(0).toUpperCase() + name.slice(1),
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="earnings" name="Gross Earnings" fill="#8884d8" />
                      <Bar yAxisId="left" dataKey="expenses" name="Expenses" fill="#82ca9d" />
                      <Bar yAxisId="left" dataKey="profit" name="Net Profit" fill="#ffc658" />
                      <Line yAxisId="right" type="monotone" dataKey="hourlyRate" name="Hourly Rate" stroke="#ff7300" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <BarChart2 className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-center text-muted-foreground">
                      Add more side hustles to compare their performance.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}


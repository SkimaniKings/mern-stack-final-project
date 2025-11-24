"use client"

import { useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowDown, ArrowUp, Info } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Sample data for the net worth timeline
const generateNetWorthData = (months = 24) => {
  const data = []
  // Use fixed starting values instead of random ones
  let assets = 50000
  let liabilities = 30000

  for (let i = 0; i < months; i++) {
    // Use deterministic growth rates instead of random ones
    // Assets grow by 2% per month
    assets = assets * 1.02
    // Liabilities decrease by 1% per month
    liabilities = Math.max(0, liabilities * 0.99)

    const netWorth = assets - liabilities
    const date = new Date()
    date.setMonth(date.getMonth() - (months - i - 1))

    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      assets: Math.round(assets),
      liabilities: Math.round(liabilities),
      netWorth: Math.round(netWorth),
    })
  }

  return data
}

// Sample data for different time periods
const timeRangeData = {
  "6m": generateNetWorthData(6),
  "1y": generateNetWorthData(12),
  "2y": generateNetWorthData(24),
  "5y": generateNetWorthData(60),
}

interface NetWorthTimelineProps {
  title?: string
  description?: string
  data?: any
}

export function NetWorthTimeline({
  title = "Net Worth Timeline",
  description = "Track your net worth over time",
  data,
}: NetWorthTimelineProps) {
  const [timeRange, setTimeRange] = useState<"6m" | "1y" | "2y" | "5y">("1y")

  // Use provided data or sample data
  const chartData = data || timeRangeData[timeRange]

  // Calculate current net worth and change
  const currentNetWorth = chartData && chartData.length >= 2 ? chartData[chartData.length - 1]?.netWorth || 0 : 0
  const previousNetWorth = chartData && chartData.length >= 2 ? chartData[chartData.length - 2]?.netWorth || 0 : 0
  const netWorthChange = currentNetWorth - previousNetWorth
  const netWorthChangePercent = previousNetWorth !== 0 ? (netWorthChange / previousNetWorth) * 100 : 0

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-4">
          <p className="font-medium">{label}</p>
          <p className="text-emerald-500">Assets: {formatCurrency(payload[0].value)}</p>
          <p className="text-red-500">Liabilities: {formatCurrency(payload[1].value)}</p>
          <p className="font-semibold text-primary">Net Worth: {formatCurrency(payload[2].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                  <span className="sr-only">Net worth information</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Net worth is calculated as your total assets minus your total liabilities.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{formatCurrency(currentNetWorth)}</span>
            <div className={`flex items-center ${netWorthChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {netWorthChange >= 0 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
              <span className="font-medium">
                {formatCurrency(Math.abs(netWorthChange))} ({netWorthChangePercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          <Tabs defaultValue={timeRange} className="mt-2 sm:mt-0" onValueChange={(value) => setTimeRange(value as any)}>
            <TabsList>
              <TabsTrigger value="6m">6M</TabsTrigger>
              <TabsTrigger value="1y">1Y</TabsTrigger>
              <TabsTrigger value="2y">2Y</TabsTrigger>
              <TabsTrigger value="5y">5Y</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[300px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-xs text-muted-foreground"
              />
              <YAxis
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-xs text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="assets"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorAssets)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="liabilities"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorLiabilities)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorNetWorth)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center mt-4 gap-6">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
            <span className="text-sm text-muted-foreground">Assets</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-sm text-muted-foreground">Liabilities</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-sm text-muted-foreground">Net Worth</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

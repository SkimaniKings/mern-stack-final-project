"use client"

import { useState } from "react"
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InfoCircledIcon } from "@radix-ui/react-icons"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FinancialDimension {
  subject: string
  value: number
  fullMark: number
  description: string
}

interface RadarChartProps {
  title?: string
  description?: string
  data?: {
    current: FinancialDimension[]
    target: FinancialDimension[]
    average: FinancialDimension[]
  }
}

// Sample data for the radar chart
const sampleData = {
  current: [
    { subject: "Savings", value: 65, fullMark: 100, description: "Percentage of income saved" },
    { subject: "Debt", value: 70, fullMark: 100, description: "Debt management score" },
    { subject: "Expenses", value: 60, fullMark: 100, description: "Expense control score" },
    { subject: "Investments", value: 45, fullMark: 100, description: "Investment diversification" },
    { subject: "Emergency Fund", value: 80, fullMark: 100, description: "Emergency fund adequacy" },
    { subject: "Insurance", value: 55, fullMark: 100, description: "Insurance coverage score" },
  ],
  target: [
    { subject: "Savings", value: 80, fullMark: 100, description: "Percentage of income saved" },
    { subject: "Debt", value: 90, fullMark: 100, description: "Debt management score" },
    { subject: "Expenses", value: 75, fullMark: 100, description: "Expense control score" },
    { subject: "Investments", value: 70, fullMark: 100, description: "Investment diversification" },
    { subject: "Emergency Fund", value: 90, fullMark: 100, description: "Emergency fund adequacy" },
    { subject: "Insurance", value: 80, fullMark: 100, description: "Insurance coverage score" },
  ],
  average: [
    { subject: "Savings", value: 50, fullMark: 100, description: "Percentage of income saved" },
    { subject: "Debt", value: 60, fullMark: 100, description: "Debt management score" },
    { subject: "Expenses", value: 55, fullMark: 100, description: "Expense control score" },
    { subject: "Investments", value: 40, fullMark: 100, description: "Investment diversification" },
    { subject: "Emergency Fund", value: 65, fullMark: 100, description: "Emergency fund adequacy" },
    { subject: "Insurance", value: 50, fullMark: 100, description: "Insurance coverage score" },
  ],
}

// Custom tooltip component for the radar chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border rounded-md shadow-md p-3">
        <p className="font-semibold">{data.subject}</p>
        <p className="text-sm text-muted-foreground">{data.description}</p>
        <p className="text-sm mt-1">
          Score: <span className="font-medium">{data.value}/100</span>
        </p>
      </div>
    )
  }
  return null
}

export function RadarChart({
  title = "Financial Health Radar",
  description = "Visualize your financial health across key dimensions",
  data = sampleData,
}: RadarChartProps) {
  const [comparisonType, setComparisonType] = useState<"target" | "average">("target")

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Tabs
            defaultValue="target"
            className="w-[200px]"
            onValueChange={(value) => setComparisonType(value as "target" | "average")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="target">Target</TabsTrigger>
              <TabsTrigger value="average">Average</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data.current}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="subject"
                tick={({ x, y, payload }) => (
                  <g transform={`translate(${x},${y})`}>
                    <text textAnchor="middle" fill="currentColor" className="text-xs font-medium" dy={4}>
                      {payload.value}
                    </text>
                  </g>
                )}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Radar
                name="Current"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
              <Radar
                name={comparisonType === "target" ? "Target" : "Average"}
                dataKey="value"
                stroke={comparisonType === "target" ? "hsl(var(--success))" : "hsl(var(--warning))"}
                fill={comparisonType === "target" ? "hsl(var(--success))" : "hsl(var(--warning))"}
                fillOpacity={0.3}
                data={comparisonType === "target" ? data.target : data.average}
              />
            </RechartsRadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          {data.current.map((dimension) => (
            <div key={dimension.subject} className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div className="flex items-center">
                <span className="text-sm font-medium">{dimension.subject}</span>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <InfoCircledIcon className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">{dimension.description}</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


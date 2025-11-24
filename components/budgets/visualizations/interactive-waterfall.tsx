"use client"

import { useState } from "react"
import { ResponsiveBar } from "@nivo/bar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

interface WaterfallData {
  category: string
  budgeted: number
  actual: number
  variance: number
}

interface InteractiveWaterfallProps {
  data: WaterfallData[]
  onDateChange?: (date: Date) => void
  onViewChange?: (view: string) => void
}

export function InteractiveWaterfall({ data, onDateChange, onViewChange }: InteractiveWaterfallProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [view, setView] = useState("monthly")
  const [sortBy, setSortBy] = useState("variance")

  const handleDateChange = (newDate: Date) => {
    setDate(newDate)
    onDateChange?.(newDate)
  }

  const handleViewChange = (newView: string) => {
    setView(newView)
    onViewChange?.(newView)
  }

  const sortData = (data: WaterfallData[]) => {
    return [...data].sort((a, b) => {
      switch (sortBy) {
        case "variance":
          return Math.abs(b.variance) - Math.abs(a.variance)
        case "budgeted":
          return b.budgeted - a.budgeted
        case "actual":
          return b.actual - a.actual
        default:
          return 0
      }
    })
  }

  const sortedData = sortData(data)

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Budget vs. Actual</CardTitle>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "MMMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && handleDateChange(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Select value={view} onValueChange={handleViewChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="variance">Variance</SelectItem>
              <SelectItem value="budgeted">Budgeted</SelectItem>
              <SelectItem value="actual">Actual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="waterfall" className="space-y-4">
          <TabsList>
            <TabsTrigger value="waterfall">Waterfall</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="waterfall" className="h-[500px]">
            <ResponsiveBar
              data={sortedData.map(d => ({
                ...d,
                variance: d.variance || 0,
                budgeted: d.budgeted || 0,
                actual: d.actual || 0,
              }))}
              keys={["variance"]}
              indexBy="category"
              margin={{ top: 50, right: 130, bottom: 50, left: 80 }}
              padding={0.3}
              valueScale={{ type: "linear" }}
              colors={({ data }) => (data.variance || 0) >= 0 ? "#22c55e" : "#ef4444"}
              borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                format: value => `$${Math.abs(value || 0).toLocaleString()}`,
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
              legends={[
                {
                  dataFrom: "keys",
                  anchor: "bottom-right",
                  direction: "column",
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: "left-to-right",
                  itemOpacity: 0.85,
                  symbolSize: 20,
                },
              ]}
              role="application"
              enableLabel={false}
              tooltip={({ id, value, color, indexValue }) => {
                const item = sortedData.find(d => d.category === indexValue)
                return (
                  <div
                    style={{
                      padding: 12,
                      background: "#ffffff",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                    }}
                  >
                    <strong>{indexValue}</strong>
                    <br />
                    Variance: <span style={{ color }}>${Math.abs(value || 0).toLocaleString()}</span>
                    <br />
                    Budgeted: ${(item?.budgeted || 0).toLocaleString()}
                    <br />
                    Actual: ${(item?.actual || 0).toLocaleString()}
                  </div>
                )
              }}
            />
          </TabsContent>

          <TabsContent value="comparison" className="h-[500px]">
            <ResponsiveBar
              data={sortedData.map(d => ({
                ...d,
                budgeted: d.budgeted || 0,
                actual: d.actual || 0,
              }))}
              keys={["budgeted", "actual"]}
              indexBy="category"
              margin={{ top: 50, right: 130, bottom: 50, left: 80 }}
              padding={0.3}
              groupMode="grouped"
              valueScale={{ type: "linear" }}
              colors={["#94a3b8", "#0ea5e9"]}
              borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                format: value => `$${(value || 0).toLocaleString()}`,
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
              enableLabel={false}
              legends={[
                {
                  dataFrom: "keys",
                  anchor: "bottom-right",
                  direction: "column",
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: "left-to-right",
                  itemOpacity: 0.85,
                  symbolSize: 20,
                },
              ]}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

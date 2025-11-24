"use client"

import { useState, useEffect } from "react"
import { CalendarIcon } from "lucide-react"
import { format, subDays, subMonths, subYears } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface TimeBasedFiltersProps {
  onFilterChange?: (range: DateRange) => void
  title?: string
  description?: string
}

export interface DateRange {
  from: Date
  to: Date
  label: string
}

export function TimeBasedFilters({
  onFilterChange,
  title = "Time Period",
  description = "Filter your financial data by time period",
}: TimeBasedFiltersProps) {
  // Use a fixed reference date for server-side rendering
  const [today, setToday] = useState(new Date("2024-01-01"))
  const [isClient, setIsClient] = useState(false)

  // Update to current date after component mounts (client-side only)
  useEffect(() => {
    setIsClient(true)
    setToday(new Date())
  }, [])

  // Create predefined ranges using the current date
  const predefinedRanges = {
    "7d": {
      from: subDays(today, 7),
      to: today,
      label: "Last 7 days",
    },
    "30d": {
      from: subDays(today, 30),
      to: today,
      label: "Last 30 days",
    },
    "90d": {
      from: subDays(today, 90),
      to: today,
      label: "Last 90 days",
    },
    "6m": {
      from: subMonths(today, 6),
      to: today,
      label: "Last 6 months",
    },
    "1y": {
      from: subYears(today, 1),
      to: today,
      label: "Last year",
    },
    ytd: {
      from: new Date(today.getFullYear(), 0, 1),
      to: today,
      label: "Year to date",
    },
    all: {
      from: subYears(today, 10),
      to: today,
      label: "All time",
    },
  }

  const [selectedRange, setSelectedRange] = useState<DateRange>(predefinedRanges["30d"])
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })
  const [isCustomRange, setIsCustomRange] = useState(false)

  const handleRangeSelect = (rangeKey: string) => {
    if (rangeKey === "custom") {
      setIsCustomRange(true)
      return
    }

    setIsCustomRange(false)
    const newRange = predefinedRanges[rangeKey as keyof typeof predefinedRanges]
    setSelectedRange(newRange)
    onFilterChange?.(newRange)
  }

  const handleCustomRangeChange = (range: { from?: Date; to?: Date }) => {
    setCustomDateRange(range)

    if (range.from && range.to) {
      const customRange = {
        from: range.from,
        to: range.to,
        label: `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`,
      }
      setSelectedRange(customRange)
      onFilterChange?.(customRange)
    }
  }

  // Only render the component after client-side hydration is complete
  if (!isClient) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent>
          <div className="h-10 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading filters...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick">Quick Select</TabsTrigger>
            <TabsTrigger value="custom">Custom Range</TabsTrigger>
          </TabsList>
          <TabsContent value="quick" className="pt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedRange === predefinedRanges["7d"] ? "default" : "outline"}
                size="sm"
                onClick={() => handleRangeSelect("7d")}
              >
                7 days
              </Button>
              <Button
                variant={selectedRange === predefinedRanges["30d"] ? "default" : "outline"}
                size="sm"
                onClick={() => handleRangeSelect("30d")}
              >
                30 days
              </Button>
              <Button
                variant={selectedRange === predefinedRanges["90d"] ? "default" : "outline"}
                size="sm"
                onClick={() => handleRangeSelect("90d")}
              >
                90 days
              </Button>
              <Button
                variant={selectedRange === predefinedRanges["6m"] ? "default" : "outline"}
                size="sm"
                onClick={() => handleRangeSelect("6m")}
              >
                6 months
              </Button>
              <Button
                variant={selectedRange === predefinedRanges["1y"] ? "default" : "outline"}
                size="sm"
                onClick={() => handleRangeSelect("1y")}
              >
                1 year
              </Button>
              <Button
                variant={selectedRange === predefinedRanges["ytd"] ? "default" : "outline"}
                size="sm"
                onClick={() => handleRangeSelect("ytd")}
              >
                YTD
              </Button>
              <Button
                variant={selectedRange === predefinedRanges["all"] ? "default" : "outline"}
                size="sm"
                onClick={() => handleRangeSelect("all")}
              >
                All time
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="custom" className="pt-4">
            <div className="flex flex-col space-y-4">
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "LLL dd, y")} - {format(customDateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(customDateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={customDateRange.from}
                      selected={customDateRange}
                      onSelect={handleCustomRangeChange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <div className="mt-4 text-sm text-muted-foreground">
          Current: <span className="font-medium text-foreground">{selectedRange.label}</span>
        </div>
      </CardContent>
    </Card>
  )
}

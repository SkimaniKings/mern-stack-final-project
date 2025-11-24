"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PerformanceData {
  timeframes: string[]
  portfolioReturns: Record<string, number>
  benchmarkReturns: Record<string, Record<string, number>>
}

interface PerformanceChartProps {
  data: PerformanceData
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  const { timeframes, portfolioReturns } = data
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={timeframes[4] || "1Y"} className="w-full">
          <TabsList className="grid grid-cols-9 mb-4">
            {timeframes.map((timeframe) => (
              <TabsTrigger key={timeframe} value={timeframe}>
                {timeframe}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {timeframes.map((timeframe) => (
            <TabsContent key={timeframe} value={timeframe} className="pt-4">
              <div className="flex flex-col items-center">
                <div className="text-4xl font-bold mb-2">
                  {portfolioReturns[timeframe] > 0 ? "+" : ""}
                  {portfolioReturns[timeframe].toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {timeframe} Performance
                </div>
                
                <div className="w-full h-[300px] mt-8 flex items-center justify-center">
                  <div className="text-muted-foreground">
                    Performance chart visualization would appear here
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default PerformanceChart

"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PerformanceData {
  timeframes: string[]
  portfolioReturns: Record<string, number>
  benchmarkReturns: Record<string, Record<string, number>>
}

interface BenchmarkComparisonChartProps {
  data: PerformanceData
}

const BenchmarkComparisonChart: React.FC<BenchmarkComparisonChartProps> = ({ data }) => {
  const { timeframes, portfolioReturns, benchmarkReturns } = data
  const benchmarks = Object.keys(benchmarkReturns)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Benchmark Comparison</CardTitle>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investment</TableHead>
                    <TableHead className="text-right">Return</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Your Portfolio</TableCell>
                    <TableCell className="text-right">
                      <span className={portfolioReturns[timeframe] >= 0 ? "text-green-600" : "text-red-600"}>
                        {portfolioReturns[timeframe] > 0 ? "+" : ""}
                        {portfolioReturns[timeframe].toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                  </TableRow>
                  
                  {benchmarks.map((benchmark) => {
                    const benchmarkReturn = benchmarkReturns[benchmark][timeframe] || 0
                    const difference = portfolioReturns[timeframe] - benchmarkReturn
                    
                    return (
                      <TableRow key={benchmark}>
                        <TableCell className="font-medium">{benchmark}</TableCell>
                        <TableCell className="text-right">
                          <span className={benchmarkReturn >= 0 ? "text-green-600" : "text-red-600"}>
                            {benchmarkReturn > 0 ? "+" : ""}
                            {benchmarkReturn.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={difference >= 0 ? "text-green-600" : "text-red-600"}>
                            {difference > 0 ? "+" : ""}
                            {difference.toFixed(2)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              
              <div className="w-full h-[200px] mt-8 flex items-center justify-center">
                <div className="text-muted-foreground">
                  Benchmark comparison visualization would appear here
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default BenchmarkComparisonChart

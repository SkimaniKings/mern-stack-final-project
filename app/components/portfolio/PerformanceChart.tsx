'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface PerformanceChartProps {
  performanceData: {
    date: string
    value: number
  }[]
  totalReturn: number
  annualizedReturn: number
  startValue: number
  endValue: number
}

export function PerformanceChart({ 
  performanceData, 
  totalReturn, 
  annualizedReturn,
  startValue,
  endValue
}: PerformanceChartProps) {
  // Handle empty data
  if (!performanceData || performanceData.length === 0) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>
            Track your investment performance over time
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-muted-foreground mb-2">No performance data available.</p>
          <p className="text-sm text-muted-foreground">Add investments to your portfolio to see performance metrics.</p>
        </CardContent>
      </Card>
    )
  }
  
  const formattedData = performanceData.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  const timeframes = [
    { value: 'week', label: '1W' },
    { value: 'month', label: '1M' },
    { value: 'quarter', label: '3M' },
    { value: 'year', label: '1Y' },
    { value: 'all', label: 'All' },
  ]

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Portfolio Performance</CardTitle>
        <CardDescription>
          Track your investment performance over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Return</p>
            <p className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Annualized Return</p>
            <p className={`text-2xl font-bold ${annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {annualizedReturn >= 0 ? '+' : ''}{annualizedReturn.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Starting Value</p>
            <p className="text-2xl font-bold">{formatCurrency(startValue)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Value</p>
            <p className="text-2xl font-bold">{formatCurrency(endValue)}</p>
          </div>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            {timeframes.map((timeframe) => (
              <TabsTrigger key={timeframe.value} value={timeframe.value}>
                {timeframe.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {timeframes.map((timeframe) => (
            <TabsContent key={timeframe.value} value={timeframe.value} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value) => [`${formatCurrency(value as number)}`, 'Portfolio Value']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name="Portfolio Value"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"

interface MarketContextProps {
  currentIndicators: {
    indicator_name: string
    value: number
    recorded_at: string
  }[]
  historicalData: Record<string, {
    value: number
    recorded_at: string
  }[]>
  showMarketContext: boolean
}

export function MarketContext({ currentIndicators, historicalData, showMarketContext }: MarketContextProps) {
  if (!showMarketContext) {
    return null
  }
  
  // Handle empty data
  if (!currentIndicators || currentIndicators.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Context</CardTitle>
          <CardDescription>
            Economic indicators that may affect your investments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-muted-foreground mb-2">No market data available at this time.</p>
            <p className="text-sm text-muted-foreground">Market data will be updated automatically when available.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format dates for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Get trend direction for each indicator
  const getTrend = (indicatorName: string) => {
    const data = historicalData[indicatorName]
    if (!data || data.length < 2) return 'neutral'
    
    const current = data[data.length - 1].value
    const previous = data[data.length - 2].value
    
    if (current > previous * 1.01) return 'up'
    if (current < previous * 0.99) return 'down'
    return 'neutral'
  }

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  // Get color for trend
  const getTrendColor = (trend: string, indicator: string) => {
    // For some indicators like unemployment and inflation, down is good
    const invertedIndicators = ['Unemployment Rate', 'Inflation Rate', 'VIX Volatility Index']
    const isInverted = invertedIndicators.includes(indicator)
    
    if (trend === 'up') return isInverted ? 'text-red-500' : 'text-green-500'
    if (trend === 'down') return isInverted ? 'text-green-500' : 'text-red-500'
    return 'text-gray-500'
  }

  // Get market sentiment based on indicators
  const getMarketSentiment = () => {
    // Simple algorithm: count positive vs negative trends
    let positive = 0
    let negative = 0
    
    currentIndicators.forEach(indicator => {
      const trend = getTrend(indicator.indicator_name)
      const invertedIndicators = ['Unemployment Rate', 'Inflation Rate', 'VIX Volatility Index']
      const isInverted = invertedIndicators.includes(indicator.indicator_name)
      
      if (trend === 'up' && !isInverted) positive++
      if (trend === 'down' && isInverted) positive++
      if (trend === 'up' && isInverted) negative++
      if (trend === 'down' && !isInverted) negative++
    })
    
    if (positive > negative + 1) return 'Bullish'
    if (negative > positive + 1) return 'Bearish'
    return 'Neutral'
  }

  // Get sentiment badge color
  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'Bullish') return 'bg-green-100 text-green-800'
    if (sentiment === 'Bearish') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Market Context</CardTitle>
            <CardDescription>
              Economic indicators that may affect your investments
            </CardDescription>
          </div>
          <Badge className={getSentimentColor(getMarketSentiment())}>
            {getMarketSentiment()} Market
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Current Indicators</h3>
            <div className="space-y-4">
              {currentIndicators.map((indicator, index) => {
                const trend = getTrend(indicator.indicator_name)
                return (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{indicator.indicator_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Updated: {formatDate(indicator.recorded_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-bold ${getTrendColor(trend, indicator.indicator_name)}`}>
                        {indicator.value.toFixed(1)}
                      </span>
                      {getTrendIcon(trend)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Historical Trends</h3>
            <Tabs defaultValue={currentIndicators[0]?.indicator_name || ""}>
              <TabsList className="mb-4">
                {currentIndicators.map((indicator, index) => (
                  <TabsTrigger key={index} value={indicator.indicator_name}>
                    {indicator.indicator_name.split(' ')[0]}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {currentIndicators.map((indicator, index) => {
                const data = historicalData[indicator.indicator_name]?.map(item => ({
                  date: formatDate(item.recorded_at),
                  value: item.value
                })) || []
                
                return (
                  <TabsContent key={index} value={indicator.indicator_name} className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          width={40}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value}`, indicator.indicator_name]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          name={indicator.indicator_name}
                          stroke="#8884d8" 
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                )
              })}
            </Tabs>
          </div>
        </div>

        <div className="mt-6 text-sm">
          <h3 className="font-semibold mb-2">Market Insights</h3>
          <ul className="space-y-1 list-disc pl-5">
            <li>
              {getMarketSentiment() === 'Bullish' 
                ? 'Current indicators suggest a favorable market environment for risk assets.'
                : getMarketSentiment() === 'Bearish'
                ? 'Current indicators suggest caution with risk assets and potential defensive positioning.'
                : 'Current indicators suggest a mixed market environment with balanced positioning.'}
            </li>
            {currentIndicators.map((indicator, index) => {
              const trend = getTrend(indicator.indicator_name)
              if (indicator.indicator_name === 'S&P 500 P/E Ratio') {
                return (
                  <li key={index}>
                    {indicator.value > 25 
                      ? 'S&P 500 P/E ratio is above historical average, suggesting potential overvaluation.'
                      : indicator.value < 15
                      ? 'S&P 500 P/E ratio is below historical average, suggesting potential undervaluation.'
                      : 'S&P 500 P/E ratio is near historical average, suggesting fair valuation.'}
                  </li>
                )
              }
              if (indicator.indicator_name === '10-Year Treasury Yield') {
                return (
                  <li key={index}>
                    {indicator.value > 4 
                      ? 'Higher treasury yields may pressure growth stocks and benefit value stocks.'
                      : indicator.value < 2
                      ? 'Lower treasury yields may benefit growth stocks and pressure financial sector.'
                      : 'Treasury yields are in a moderate range, suggesting balanced impact across sectors.'}
                  </li>
                )
              }
              if (indicator.indicator_name === 'VIX Volatility Index') {
                return (
                  <li key={index}>
                    {indicator.value > 25 
                      ? 'Elevated VIX suggests market uncertainty and potential for defensive positioning.'
                      : indicator.value < 15
                      ? 'Low VIX suggests market complacency, which can precede corrections.'
                      : 'VIX is in a moderate range, suggesting normal market volatility.'}
                  </li>
                )
              }
              return null
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

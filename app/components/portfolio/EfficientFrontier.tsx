'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Legend } from 'recharts'
import { Badge } from "@/components/ui/badge"

interface EfficientFrontierProps {
  frontierPoints: {
    risk: number
    expected_return: number
    allocation: Record<string, number>
  }[]
  currentPortfolio: {
    risk: number
    return: number
    allocation: Record<string, number>
  } | null
}

export function EfficientFrontier({ frontierPoints, currentPortfolio }: EfficientFrontierProps) {
  // Handle empty data
  if (!frontierPoints || frontierPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Efficient Frontier</CardTitle>
          <CardDescription>
            Visualize risk vs. return for optimal portfolio allocation
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-muted-foreground mb-2">No portfolio optimization data available.</p>
          <p className="text-sm text-muted-foreground">Add diverse investments to your portfolio to see optimization recommendations.</p>
        </CardContent>
      </Card>
    )
  }
  // Transform data for the chart
  const frontierData = frontierPoints.map(point => ({
    x: point.risk,
    y: point.expected_return,
    z: 10,
    type: 'Efficient Frontier',
    allocation: point.allocation
  }))

  // Add current portfolio point if available
  const chartData = currentPortfolio 
    ? [...frontierData, {
        x: currentPortfolio.risk,
        y: currentPortfolio.return,
        z: 20,
        type: 'Current Portfolio',
        allocation: currentPortfolio.allocation
      }]
    : frontierData

  // Find optimal portfolio (highest Sharpe ratio - assuming risk-free rate of 2%)
  const riskFreeRate = 2
  let optimalPortfolio = frontierPoints[0]
  let maxSharpe = 0

  frontierPoints.forEach(point => {
    const sharpe = (point.expected_return - riskFreeRate) / point.risk
    if (sharpe > maxSharpe) {
      maxSharpe = sharpe
      optimalPortfolio = point
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Efficient Frontier</CardTitle>
        <CardDescription>
          Visualize risk vs. return for optimal portfolio allocation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Risk" 
                unit="%" 
                domain={['dataMin - 1', 'dataMax + 1']}
                label={{ value: 'Risk (%)', position: 'bottom', offset: 0 }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Expected Return" 
                unit="%" 
                domain={['dataMin - 1', 'dataMax + 1']}
                label={{ value: 'Expected Return (%)', angle: -90, position: 'left' }}
              />
              <ZAxis type="number" dataKey="z" range={[60, 200]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => {
                  if (name === 'Risk' || name === 'Expected Return') {
                    return [`${value}%`, name]
                  }
                  return [value, name]
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-bold">{data.type}</p>
                        <p>Risk: {data.x.toFixed(2)}%</p>
                        <p>Return: {data.y.toFixed(2)}%</p>
                        <div className="mt-2">
                          <p className="font-semibold">Allocation:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(data.allocation)
                              .filter(([_, value]) => (value as number) > 0)
                              .sort(([_, a], [__, b]) => (b as number) - (a as number))
                              .map(([key, value]) => (
                                <Badge key={key} variant="outline">
                                  {key}: {(value as number).toFixed(1)}%
                                </Badge>
                              ))
                            }
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Scatter 
                name="Efficient Frontier" 
                data={frontierData} 
                fill="#8884d8" 
                line 
                shape="circle"
              />
              {currentPortfolio && (
                <Scatter 
                  name="Current Portfolio" 
                  data={[chartData[chartData.length - 1]]} 
                  fill="#ff7300" 
                  shape="star"
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Optimal Portfolio</h3>
            <p>Risk: {optimalPortfolio.risk.toFixed(2)}%</p>
            <p>Expected Return: {optimalPortfolio.expected_return.toFixed(2)}%</p>
            <p>Sharpe Ratio: {((optimalPortfolio.expected_return - riskFreeRate) / optimalPortfolio.risk).toFixed(2)}</p>
            <div className="mt-2">
              <p className="font-semibold">Recommended Allocation:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(optimalPortfolio.allocation)
                  .filter(([_, value]) => value > 0)
                  .sort(([_, a], [__, b]) => b - a)
                  .map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}: {value.toFixed(1)}%
                    </Badge>
                  ))
                }
              </div>
            </div>
          </div>

          {currentPortfolio && (
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Your Current Portfolio</h3>
              <p>Risk: {currentPortfolio.risk.toFixed(2)}%</p>
              <p>Expected Return: {currentPortfolio.return.toFixed(2)}%</p>
              <p>Sharpe Ratio: {((currentPortfolio.return - riskFreeRate) / currentPortfolio.risk).toFixed(2)}</p>
              <div className="mt-2">
                <p className="font-semibold">Current Allocation:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(currentPortfolio.allocation)
                    .filter(([_, value]) => value > 0)
                    .sort(([_, a], [__, b]) => b - a)
                    .map(([key, value]) => (
                      <Badge key={key} variant="outline">
                        {key}: {value.toFixed(1)}%
                      </Badge>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

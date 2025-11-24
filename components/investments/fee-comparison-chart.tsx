"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface FeeComparisonChartProps {
  investments: any[]
}

// Industry average expense ratios by investment type
const INDUSTRY_AVERAGES = {
  Stocks: 0.3,
  Bonds: 0.25,
  International: 0.4,
  "Real Estate": 0.35,
  Commodities: 0.5,
  Alternative: 0.85,
  Cash: 0.15,
  Balanced: 0.4,
}

export function FeeComparisonChart({ investments }: FeeComparisonChartProps) {
  const [showAll, setShowAll] = useState(false)

  // Group investments by type and calculate average expense ratio
  const investmentsByType = investments.reduce((acc, investment) => {
    const type = investment.investment_type
    if (!acc[type]) {
      acc[type] = {
        type,
        count: 0,
        totalExpenseRatio: 0,
        totalValue: 0,
        investments: [],
      }
    }

    acc[type].count++
    acc[type].totalExpenseRatio += investment.fee_percentage
    acc[type].totalValue += investment.current_value
    acc[type].investments.push(investment)

    return acc
  }, {})

  // Calculate average expense ratio for each type
  const typeData = Object.values(investmentsByType).map((group: any) => ({
    name: group.type,
    yourAverage: group.totalExpenseRatio / group.count,
    industryAverage: INDUSTRY_AVERAGES[group.type] || 0.35,
    totalValue: group.totalValue,
    count: group.count,
  }))

  // Sort by difference between your average and industry average
  const sortedData = typeData.sort((a, b) => b.yourAverage - b.industryAverage - (a.yourAverage - a.industryAverage))

  // Limit to top 5 if not showing all
  const chartData = showAll ? sortedData : sortedData.slice(0, 5)

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis
            label={{ value: "Expense Ratio (%)", angle: -90, position: "insideLeft" }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, "Expense Ratio"]} />
          <Legend />
          <Bar dataKey="yourAverage" name="Your Average" fill="#8884d8" barSize={20} />
          <Bar dataKey="industryAverage" name="Industry Average" fill="#82ca9d" barSize={20} />
        </BarChart>
      </ResponsiveContainer>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Fee Comparison by Investment Type</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {chartData.map((item, index) => (
            <Card key={index}>
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="font-medium">{item.name}</h5>
                    <p className="text-xs text-muted-foreground">
                      {item.count} investments, ${item.totalValue.toFixed(2)} total
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-xs">You:</span>
                      <Badge
                        variant={
                          item.yourAverage > item.industryAverage * 1.5
                            ? "destructive"
                            : item.yourAverage > item.industryAverage
                              ? "default"
                              : "outline"
                        }
                      >
                        {item.yourAverage.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs">Avg:</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {item.industryAverage.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {typeData.length > 5 && (
        <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)} className="w-full">
          {showAll ? "Show Top 5 Only" : `Show All ${typeData.length} Types`}
        </Button>
      )}
    </div>
  )
}


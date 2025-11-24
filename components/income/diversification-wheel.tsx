"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface DiversificationWheelProps {
  sources: any[]
  isLoading?: boolean
  onRefresh?: () => void
}

interface IncomeSource {
  type: string
  amount: number
  frequency: string
}

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A569BD", 
  "#5DADE2", "#48C9B0", "#F4D03F", "#EB984E", "#EC7063"
]

// Function to normalize income to monthly amount
const normalizeToMonthly = (amount: number, frequency: string): number => {
  switch (frequency) {
    case "daily": return amount * 30.42; // Average days in a month
    case "weekly": return amount * 4.33; // Average weeks in a month
    case "bi-weekly": return amount * 2.17; // Bi-weekly periods in a month
    case "monthly": return amount;
    case "annually": return amount / 12;
    case "one-time": return amount / 12; // Spread one-time income over a year
    default: return amount;
  }
};

export function DiversificationWheel({ 
  sources, 
  isLoading = false, 
  onRefresh 
}: DiversificationWheelProps) {
  // Process data for pie chart
  const pieData = React.useMemo(() => {
    if (!sources || sources.length === 0) return []
    
    // Group by type and sum amounts (normalized to monthly)
    const typeDistribution: Record<string, number> = {}
    let total = 0
    
    sources.forEach((source: IncomeSource) => {
      const normalizedAmount = normalizeToMonthly(Number(source.amount), source.frequency);
      typeDistribution[source.type] = (typeDistribution[source.type] || 0) + normalizedAmount;
      total += normalizedAmount;
    })
    
    // Convert to array and calculate percentages
    return Object.entries(typeDistribution).map(([type, amount]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize type
      value: amount,
      percentage: Math.round((Number(amount) / total) * 100)
    }))
  }, [sources])
  
  // Calculate diversity metrics
  const diversityMetrics = React.useMemo(() => {
    if (!sources || sources.length === 0) return { 
      sourceCount: 0, 
      primaryDependency: "N/A", 
      primaryPercentage: 0 
    };
    
    const sourceCount = sources.length;
    let primaryType = "";
    let primaryPercentage = 0;
    
    if (pieData.length > 0) {
      // Find the income type with highest value
      const sortedData = [...pieData].sort((a, b) => b.value - a.value);
      primaryType = sortedData[0].name;
      primaryPercentage = sortedData[0].percentage;
    }
    
    return {
      sourceCount,
      primaryDependency: primaryType,
      primaryPercentage
    };
  }, [sources, pieData]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income Diversification</CardTitle>
          <CardDescription>Analyzing your income streams...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Skeleton className="h-[200px] w-[200px] rounded-full" />
          <Skeleton className="h-4 w-3/4 mt-4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Income Diversification</CardTitle>
          <CardDescription>Visualize your income stream distribution</CardDescription>
        </div>
        {onRefresh && (
          <Button variant="outline" size="icon" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-1/2">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => {
                      const entry = pieData.find(item => item.name === name)
                      return [`$${Number(value).toFixed(2)} (${entry?.percentage}%)`, name]
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No income sources found
              </div>
            )}
          </div>
          
          <div className="w-full md:w-1/2 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Income Sources</p>
                <p className="text-2xl font-bold">{diversityMetrics.sourceCount}</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Primary Income Type</p>
                <p className="text-2xl font-bold">{diversityMetrics.primaryDependency}</p>
                {diversityMetrics.primaryPercentage > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {diversityMetrics.primaryPercentage}% of total income
                  </p>
                )}
              </div>
            </div>
            
            {diversityMetrics.sourceCount === 1 && (
              <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md text-sm mt-2">
                <p className="font-medium text-amber-800 dark:text-amber-300">Recommendation:</p>
                <p className="text-amber-700 dark:text-amber-400">
                  Consider adding more diverse income streams to improve your financial resilience.
                </p>
              </div>
            )}
            
            {diversityMetrics.primaryPercentage > 70 && diversityMetrics.sourceCount > 1 && (
              <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md text-sm mt-2">
                <p className="font-medium text-amber-800 dark:text-amber-300">Recommendation:</p>
                <p className="text-amber-700 dark:text-amber-400">
                  You rely heavily on one income type. Consider diversifying further to reduce risk.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

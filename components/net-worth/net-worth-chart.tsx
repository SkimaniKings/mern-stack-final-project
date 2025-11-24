"use client"

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
  BarChart,
  Bar
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils/format"
import { useState } from "react"

interface NetWorthHistoryItem {
  date: string
  netWorth: number
}

interface FormattedNetWorthItem extends NetWorthHistoryItem {
  formattedDate: string
  projected?: boolean
  assets?: number
  liabilities?: number
}

interface NetWorthChartProps {
  data: NetWorthHistoryItem[]
  currentNetWorth: number
  assetsHistory?: {
    date: string
    value: number
  }[]
  liabilitiesHistory?: {
    date: string
    value: number
  }[]
}

export function NetWorthChart({ 
  data, 
  currentNetWorth, 
  assetsHistory = [], 
  liabilitiesHistory = [] 
}: NetWorthChartProps) {
  const [activeTab, setActiveTab] = useState("net-worth")
  // Calculate the minimum and maximum values for better chart scaling
  const minValue = Math.min(...data.map(item => item.netWorth)) * 0.9
  const maxValue = Math.max(...data.map(item => item.netWorth)) * 1.1

  // Format dates for better display and combine with assets/liabilities data
  const formattedData: FormattedNetWorthItem[] = data.map(item => {
    // Find matching assets and liabilities for this date
    const assetItem = assetsHistory.find(a => a.date === item.date);
    const liabilityItem = liabilitiesHistory.find(l => l.date === item.date);
    
    return {
      ...item,
      formattedDate: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      }),
      assets: assetItem?.value || 0,
      liabilities: liabilityItem?.value || 0
    };
  })

  // Calculate trend data
  const calculateTrendData = (): FormattedNetWorthItem[] => {
    if (data.length < 2) return formattedData

    const firstPoint = data[0]
    const lastPoint = data[data.length - 1]
    
    const monthsDiff = new Date(lastPoint.date).getMonth() - new Date(firstPoint.date).getMonth() + 
      (new Date(lastPoint.date).getFullYear() - new Date(firstPoint.date).getFullYear()) * 12
    
    if (monthsDiff === 0) return formattedData

    const monthlyGrowth = (lastPoint.netWorth - firstPoint.netWorth) / monthsDiff
    
    // Project 6 months into the future
    const projectedData: FormattedNetWorthItem[] = [...formattedData]
    
    for (let i = 1; i <= 6; i++) {
      const lastDate = new Date(lastPoint.date)
      lastDate.setMonth(lastDate.getMonth() + i)
      
      projectedData.push({
        date: lastDate.toISOString().substring(0, 7),
        netWorth: lastPoint.netWorth + (monthlyGrowth * i),
        formattedDate: lastDate.toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        }),
        projected: true
      })
    }
    
    return projectedData
  }

  const chartData = calculateTrendData()

  // Find the index where projection starts
  const projectionStartIndex = data.length - 1

  // Prepare data for assets vs liabilities chart
  const assetsVsLiabilitiesData = chartData.map(item => ({
    ...item,
    assets: item.assets || 0,
    liabilities: item.liabilities || 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Growth</CardTitle>
        <CardDescription>Track your financial progress over time</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="net-worth" className="mb-4" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="net-worth">Net Worth</TabsTrigger>
            <TabsTrigger value="assets-vs-liabilities">Assets vs Liabilities</TabsTrigger>
          </TabsList>
          
          <TabsContent value="net-worth" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 20,
                    bottom: 30,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                    angle={-45}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                    domain={[minValue, maxValue]}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Net Worth"]}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  
                  {/* Historical data */}
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    name="Net Worth"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    activeDot={{ r: 8 }}
                    dot={{ r: 4 }}
                    isAnimationActive={true}
                    strokeWidth={2}
                  />
                  
                  {/* Projection line */}
                  {projectionStartIndex > 0 && (
                    <Line
                      type="monotone"
                      dataKey="netWorth"
                      stroke="#10b981"
                      strokeDasharray="5 5"
                      name="Projected Growth"
                      dot={false}
                      activeDot={false}
                      isAnimationActive={true}
                      strokeWidth={2}
                      connectNulls={true}
                      hide={chartData.findIndex(d => d.projected === true) === -1}
                    />
                  )}
                  
                  {/* Reference line for current net worth */}
                  <ReferenceLine 
                    y={currentNetWorth} 
                    stroke="#f43f5e" 
                    strokeDasharray="3 3"
                    label={{ 
                      value: 'Current', 
                      position: 'insideTopRight',
                      fill: '#f43f5e',
                      fontSize: 12
                    }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="assets-vs-liabilities" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={assetsVsLiabilitiesData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 20,
                    bottom: 30,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                    angle={-45}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      const label = name === 'assets' ? 'Assets' : 'Liabilities';
                      return [formatCurrency(value), label];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  
                  {/* Assets */}
                  <Area
                    type="monotone"
                    dataKey="assets"
                    name="Assets"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                    activeDot={{ r: 6 }}
                    dot={{ r: 3 }}
                    isAnimationActive={true}
                    strokeWidth={2}
                  />
                  
                  {/* Liabilities */}
                  <Area
                    type="monotone"
                    dataKey="liabilities"
                    name="Liabilities"
                    stroke="#f43f5e"
                    fill="#f43f5e"
                    fillOpacity={0.2}
                    activeDot={{ r: 6 }}
                    dot={{ r: 3 }}
                    isAnimationActive={true}
                    strokeWidth={2}
                  />
                  
                  {/* Net Worth Line */}
                  <Line
                    type="monotone"
                    dataKey="netWorth"
                    name="Net Worth"
                    stroke="#3b82f6"
                    dot={false}
                    isAnimationActive={true}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}



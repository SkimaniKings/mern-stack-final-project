"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  getPortfolioAllocationAnalysis,
  getRebalancingSuggestions
} from "@/app/actions/investment-portfolios"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

interface AllocationAnalysisItem {
  portfolio_id: string
  portfolio_name: string
  asset_class: string
  asset_value: number
  target_percent: number
}

interface RebalancingSuggestion {
  portfolio_id: string
  user_id: string
  asset_class: string
  current_value: number
  target_percent: number
  actual_percent: number
  adjustment_needed: number
}

interface PortfolioAllocationAnalysisProps {
  portfolioId: string
  portfolioName: string
}

// Define colors for different asset classes
const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", 
  "#82CA9D", "#A4DE6C", "#D0ED57", "#FFC658", "#FF7300"
];

export function PortfolioAllocationAnalysis({ portfolioId, portfolioName }: PortfolioAllocationAnalysisProps) {
  const [allocationData, setAllocationData] = useState<AllocationAnalysisItem[]>([])
  const [rebalancingData, setRebalancingData] = useState<RebalancingSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Fetch allocation and rebalancing data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch allocation analysis
        const allocationResult = await getPortfolioAllocationAnalysis(portfolioId)
        if (allocationResult.error) {
          toast({
            title: "Error",
            description: allocationResult.error,
            variant: "destructive",
          })
        } else if (allocationResult.data) {
          setAllocationData(allocationResult.data)
        }

        // Fetch rebalancing suggestions
        const rebalancingResult = await getRebalancingSuggestions(portfolioId)
        if (rebalancingResult.error) {
          toast({
            title: "Error",
            description: rebalancingResult.error,
            variant: "destructive",
          })
        } else if (rebalancingResult.data) {
          setRebalancingData(rebalancingResult.data)
        }
      } catch (error) {
        console.error("Error fetching allocation data:", error)
        toast({
          title: "Error",
          description: "Failed to load portfolio analysis",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [portfolioId, toast])

  // Prepare data for pie chart
  const preparePieChartData = () => {
    return allocationData.map((item) => ({
      name: item.asset_class.charAt(0).toUpperCase() + item.asset_class.slice(1).replace('_', ' '),
      value: item.asset_value,
    }))
  }

  // Prepare data for comparison chart
  const prepareComparisonData = () => {
    return allocationData.map((item) => ({
      name: item.asset_class.charAt(0).toUpperCase() + item.asset_class.slice(1).replace('_', ' '),
      actual: parseFloat(((item.asset_value / getTotalPortfolioValue()) * 100).toFixed(2)),
      target: item.target_percent,
    }))
  }

  // Calculate total portfolio value
  const getTotalPortfolioValue = () => {
    return allocationData.reduce((sum, item) => sum + item.asset_value, 0)
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p>{formatCurrency(data.value)}</p>
          <p>{formatPercentage((data.value / getTotalPortfolioValue()) * 100)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{portfolioName} - Allocation Analysis</h2>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <p>Loading analysis data...</p>
        </div>
      ) : allocationData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No allocation data available. Add holdings to your portfolio to see analysis.</p>
        </div>
      ) : (
        <Tabs defaultValue="allocation" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="allocation">Current Allocation</TabsTrigger>
            <TabsTrigger value="rebalancing">Rebalancing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="allocation" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Allocation</CardTitle>
                  <CardDescription>
                    Distribution of your portfolio by asset class
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={preparePieChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {preparePieChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Target vs. Actual</CardTitle>
                  <CardDescription>
                    Comparison of target and actual allocation
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareComparisonData()}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip formatter={(value) => [`${value}%`, ""]} />
                      <Legend />
                      <Bar dataKey="actual" name="Actual" fill="#8884d8" />
                      <Bar dataKey="target" name="Target" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Allocation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Class</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Actual %</TableHead>
                      <TableHead className="text-right">Target %</TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocationData.map((item) => {
                      const actualPercent = (item.asset_value / getTotalPortfolioValue()) * 100
                      const difference = actualPercent - item.target_percent
                      
                      return (
                        <TableRow key={item.asset_class}>
                          <TableCell className="font-medium">
                            {item.asset_class.charAt(0).toUpperCase() + 
                             item.asset_class.slice(1).replace('_', ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.asset_value)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercentage(actualPercent)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercentage(item.target_percent)}
                          </TableCell>
                          <TableCell className={`text-right ${difference >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {difference >= 0 ? '+' : ''}{formatPercentage(difference)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow>
                      <TableCell className="font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(getTotalPortfolioValue())}
                      </TableCell>
                      <TableCell className="text-right font-bold">100.00%</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatPercentage(
                          allocationData.reduce((sum, item) => sum + item.target_percent, 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right"></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rebalancing" className="space-y-6">
            {rebalancingData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No rebalancing data available. Set target allocations for your portfolio.</p>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Rebalancing Suggestions</CardTitle>
                    <CardDescription>
                      Adjustments needed to align with your target allocation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset Class</TableHead>
                          <TableHead className="text-right">Current Value</TableHead>
                          <TableHead className="text-right">Current %</TableHead>
                          <TableHead className="text-right">Target %</TableHead>
                          <TableHead className="text-right">Adjustment Needed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rebalancingData.map((item) => (
                          <TableRow key={item.asset_class}>
                            <TableCell className="font-medium">
                              {item.asset_class.charAt(0).toUpperCase() + 
                               item.asset_class.slice(1).replace('_', ' ')}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.current_value)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercentage(item.actual_percent)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercentage(item.target_percent)}
                            </TableCell>
                            <TableCell className={`text-right ${item.adjustment_needed >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {item.adjustment_needed >= 0 ? '+' : ''}
                              {formatCurrency(item.adjustment_needed)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {rebalancingData.map((item, index) => (
                    <Card key={item.asset_class}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">
                          {item.asset_class.charAt(0).toUpperCase() + 
                           item.asset_class.slice(1).replace('_', ' ')}
                        </CardTitle>
                        <CardDescription>
                          {item.adjustment_needed > 0 
                            ? `Buy ${formatCurrency(item.adjustment_needed)} more` 
                            : `Sell ${formatCurrency(Math.abs(item.adjustment_needed))}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Current: {formatPercentage(item.actual_percent)}</span>
                            <span>Target: {formatPercentage(item.target_percent)}</span>
                          </div>
                          <Progress 
                            value={item.actual_percent} 
                            max={Math.max(item.actual_percent, item.target_percent) * 1.2} 
                            className="h-2"
                          />
                          <div className="h-2 w-full relative">
                            <div 
                              className="absolute top-0 h-4 w-0.5 bg-black"
                              style={{ 
                                left: `${(item.target_percent / Math.max(item.actual_percent, item.target_percent) * 1.2) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

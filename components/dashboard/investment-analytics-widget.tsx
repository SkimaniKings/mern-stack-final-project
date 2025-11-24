"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { fetchInvestments } from "@/app/actions/investments"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

// Define investment type
interface Investment {
  id: string
  name: string
  ticker?: string
  type?: string
  price?: number
  shares?: number
  value?: number
  allocation?: number
  sector?: string
}

export function InvestmentAnalyticsWidget() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<string>("overview")
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function loadInvestments() {
      try {
        console.log('InvestmentAnalyticsWidget: Loading investment data...')
        setLoading(true)
        setError(null)
        
        try {
          // Explicitly pass the type parameter to fetchInvestments
          console.log('InvestmentAnalyticsWidget: Fetching portfolio investments...')
          const data = await fetchInvestments({ type: 'portfolio' })
          console.log(`InvestmentAnalyticsWidget: Successfully fetched ${data.length} investments`)
          setInvestments(data)
        } catch (fetchError) {
          console.error('InvestmentAnalyticsWidget: Error fetching investments:', fetchError)
          // Try again with the universe type as fallback
          console.log('InvestmentAnalyticsWidget: Attempting to fetch from investment universe instead...')
          try {
            const fallbackData = await fetchInvestments({ type: 'universe' })
            console.log(`InvestmentAnalyticsWidget: Successfully fetched ${fallbackData.length} investments from universe`)
            setInvestments(fallbackData)
          } catch (fallbackError) {
            console.error('InvestmentAnalyticsWidget: Error fetching fallback investments:', fallbackError)
            throw new Error('Failed to load investment data from both portfolio and universe')
          }
        }
      } catch (err) {
        console.error("InvestmentAnalyticsWidget: Error loading investments:", err)
        setError("Failed to load investment data")
        // Set investments to empty array to avoid undefined errors
        setInvestments([])
      } finally {
        setLoading(false)
      }
    }
    
    loadInvestments()
  }, [])
  
  // Calculate total portfolio value
  const totalValue = investments.reduce((sum, inv) => sum + (inv.value || 0), 0)
  
  // Define the sector data type with percentage property
  type SectorData = { name: string; value: number; percentage?: number }
  
  // Prepare data for sector allocation chart
  const sectorData = investments.reduce((acc, inv) => {
    if (inv.sector) {
      const existingSector = acc.find(item => item.name === inv.sector)
      if (existingSector) {
        existingSector.value += (inv.value || 0)
      } else {
        acc.push({ name: inv.sector, value: inv.value || 0 })
      }
    }
    return acc
  }, [] as SectorData[])
  
  // Calculate sector percentages and sort by value
  sectorData.forEach(sector => {
    sector.percentage = (sector.value / totalValue) * 100
  })
  sectorData.sort((a, b) => b.value - a.value)
  
  // Prepare data for performance chart (simulated for this example)
  const topInvestments = investments
    .filter(inv => inv.value !== undefined && inv.value > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 5)
  
  // Colors for the charts
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e"]
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <CardTitle>Investment Portfolio Analytics</CardTitle>
            <CardDescription>
              Overview of your investment portfolio performance and allocation
            </CardDescription>
          </div>
          
          <Tabs value={activeView} onValueChange={setActiveView} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[250px] w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-10 w-1/3" />
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-red-500">{error}</p>
          </div>
        ) : investments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[250px] space-y-4">
            <p className="text-muted-foreground">No investment data available</p>
            <Button asChild variant="outline">
              <a href="/investments">Set up your investment portfolio <ArrowRight className="ml-2 h-4 w-4" /></a>
            </Button>
          </div>
        ) : (
          <>
            {activeView === "overview" && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-card border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Value</h3>
                    <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                  </div>
                  
                  <div className="bg-card border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Investments</h3>
                    <p className="text-2xl font-bold">{investments.length}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Top Holdings</h3>
                  <div className="space-y-2">
                    {topInvestments.map((inv, index) => (
                      <div key={inv.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs text-primary font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{inv.name}</p>
                            <div className="flex items-center gap-2">
                              {inv.ticker && <Badge variant="outline">{inv.ticker}</Badge>}
                              {inv.type && <span className="text-xs text-muted-foreground">{inv.type}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(inv.value || 0)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPercentage((inv.value || 0) / totalValue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {activeView === "allocation" && (
              <div className="space-y-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sectorData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      >
                        {sectorData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Sector Allocation</h3>
                  <div className="space-y-2">
                    {sectorData.map((sector, index) => (
                      <div key={sector.name} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <p>{sector.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(sector.value)}</p>
                          <p className="text-xs text-muted-foreground">{formatPercentage(sector.value / totalValue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <Button asChild variant="outline">
                <a href="/investments">View Full Investment Portfolio <ArrowRight className="ml-2 h-4 w-4" /></a>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

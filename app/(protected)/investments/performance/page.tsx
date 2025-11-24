"use client"

import { useState, useEffect } from "react"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { getInvestments, getPortfolioPerformance } from "@/app/actions/investments"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

// Force dynamic rendering to handle cookies
export const dynamic = 'force-dynamic'

export default function InvestmentPerformancePage() {
  const [investments, setInvestments] = useState<any[]>([])
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('year')

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        // Fetch investments
        const investmentsResult = await getInvestments()
        const investmentsData = Array.isArray(investmentsResult) ? investmentsResult : []
        setInvestments(investmentsData)

        // Fetch performance data
        const performanceResult = await getPortfolioPerformance(timeframe)
        setPerformanceData(performanceResult)
      } catch (error) {
        console.error('Error fetching performance data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [timeframe])

  // Calculate performance metrics from investment data
  const calculateInvestmentPerformance = (investment: any) => {
    // Use initial cost and current price for performance calculation
    const initialCost = parseFloat(investment.cost_basis) || 0;
    const currentValue = parseFloat(investment.value) || 0;
    
    // Calculate absolute return
    const absoluteReturn = currentValue - initialCost;
    
    // Calculate percentage return
    const percentReturn = initialCost > 0 ? (absoluteReturn / initialCost) * 100 : 0;
    
    // Calculate annualized return based on purchase date
    let annualizedReturn = 0;
    if (investment.purchase_date && initialCost > 0 && currentValue > 0) {
      const purchaseDate = new Date(investment.purchase_date);
      const currentDate = new Date();
      
      // Calculate years held (handle same day purchase with a minimum of 1 day)
      const millisecondsHeld = Math.max(currentDate.getTime() - purchaseDate.getTime(), 86400000); // at least 1 day
      const yearsHeld = millisecondsHeld / (1000 * 60 * 60 * 24 * 365.25);
      
      // Calculate annualized return using CAGR formula: (Current/Initial)^(1/years) - 1
      if (yearsHeld > 0) {
        // Calculate annualized return using CAGR formula
        try {
          const rawAnnualizedReturn = (Math.pow(currentValue / initialCost, 1 / yearsHeld) - 1) * 100;
          
          // Handle extremely large numbers or Infinity by capping at a reasonable maximum
          if (!isFinite(rawAnnualizedReturn) || Math.abs(rawAnnualizedReturn) > 1000) {
            // Cap at +/- 1000% for extremely large returns
            annualizedReturn = Math.sign(rawAnnualizedReturn) * 1000;
          } else {
            annualizedReturn = Number(rawAnnualizedReturn.toFixed(2));
          }
        } catch (error) {
          // Fallback to a reasonable value in case of calculation errors
          annualizedReturn = 0;
        }
      }
    }
    
    return {
      absoluteReturn,
      percentReturn,
      annualizedReturn,
      initialCost,
      currentValue,
      purchaseDate: investment.purchase_date
    };
  };
  
  // Calculate overall performance metrics
  const calculateOverallPerformance = () => {
    if (!performanceData) {
      // If no performance data from API, calculate from investments
      if (investments && investments.length > 0) {
        let totalInitialCost = 0;
        let totalCurrentValue = 0;
        let oldestPurchaseDate = new Date();
        
        // Calculate totals
        investments.forEach(investment => {
          const initialCost = parseFloat(investment.cost_basis) || 0;
          const currentValue = parseFloat(investment.value) || 0;
          
          totalInitialCost += initialCost;
          totalCurrentValue += currentValue;
          
          // Track oldest purchase date
          if (investment.purchase_date) {
            const purchaseDate = new Date(investment.purchase_date);
            if (purchaseDate < oldestPurchaseDate) {
              oldestPurchaseDate = purchaseDate;
            }
          }
        });
        
        // Calculate absolute and percentage returns
        const totalReturn = totalInitialCost > 0 ? ((totalCurrentValue - totalInitialCost) / totalInitialCost) * 100 : 0;
        
        // Calculate annualized return
        let annualizedReturn = 0;
        const currentDate = new Date();
        const millisecondsHeld = Math.max(currentDate.getTime() - oldestPurchaseDate.getTime(), 86400000); // at least 1 day
        const yearsHeld = millisecondsHeld / (1000 * 60 * 60 * 24 * 365.25);
        
        if (yearsHeld > 0 && totalInitialCost > 0 && totalCurrentValue > 0) {
          try {
            const rawAnnualizedReturn = (Math.pow(totalCurrentValue / totalInitialCost, 1 / yearsHeld) - 1) * 100;
            annualizedReturn = Number(rawAnnualizedReturn.toFixed(2));
          } catch (error) {
            annualizedReturn = 0;
          }
        }
        
        // Calculate basic risk metrics based on investment diversity
        const numInvestments = investments.length;
        const diversificationFactor = Math.min(numInvestments / 10, 1); // Max diversification at 10+ investments
        
        // Estimate volatility based on asset types
        let estimatedVolatility = 15; // Default medium volatility
        const stockCount = investments.filter(inv => ['Stocks', 'Shares'].includes(inv.type)).length;
        const bondCount = investments.filter(inv => ['Bonds', 'Bills'].includes(inv.type)).length;
        const cashCount = investments.filter(inv => ['Cash'].includes(inv.type)).length;
        const alternativeCount = investments.filter(inv => ['Alternative', 'Crypto', 'Real Estate'].includes(inv.type)).length;
        
        // Initialize percentages
        let stockPct = 0;
        let bondPct = 0;
        let cashPct = 0;
        let alternativePct = 0;
        
        // Adjust volatility based on portfolio composition
        const totalCount = stockCount + bondCount + cashCount + alternativeCount;
        if (totalCount > 0) {
          stockPct = stockCount / totalCount;
          bondPct = bondCount / totalCount;
          cashPct = cashCount / totalCount;
          alternativePct = alternativeCount / totalCount;
          
          // Weighted volatility (stocks ~20%, bonds ~5%, cash ~1%, alternatives ~30%)
          estimatedVolatility = stockPct * 20 + bondPct * 5 + cashPct * 1 + alternativePct * 30;
        }
        
        // Apply diversification effect
        const volatility = estimatedVolatility * (1 - diversificationFactor * 0.3);
        
        // Calculate Sharpe ratio (using 2% as risk-free rate)
        const riskFreeRate = 2.0;
        const sharpeRatio = volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;
        
        // Estimate beta based on stock percentage
        const beta = 0.8 + (stockPct * 0.4); // Range from 0.8 to 1.2 based on stock allocation
        
        return {
          totalReturn: Number(totalReturn.toFixed(2)),
          annualizedReturn,
          volatility: Number(volatility.toFixed(2)),
          sharpeRatio: Number(sharpeRatio.toFixed(2)),
          beta: Number(beta.toFixed(2))
        };
      }
      
      return {
        totalReturn: 0,
        annualizedReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
        beta: 0
      };
    }

    // Use the risk metrics from the API if available
    const overall = {
      totalReturn: performanceData.totalReturn || 0,
      annualizedReturn: performanceData.annualizedReturn || 0,
      volatility: performanceData.riskMetrics?.volatility || 0,
      sharpeRatio: performanceData.riskMetrics?.sharpeRatio || 0,
      beta: performanceData.riskMetrics?.beta || 0
    };
    
    return overall;
  }

  const overallPerformance = calculateOverallPerformance()

  // Format percentage
  const formatPercentage = (value: number) => {
    // Handle invalid or extreme values
    if (!isFinite(value)) {
      return value > 0 ? '+999.99%' : '-999.99%';
    }
    
    // Cap extremely large values
    const cappedValue = Math.min(Math.max(value, -1000), 1000);
    const sign = cappedValue >= 0 ? '+' : '';
    
    // Round to 2 decimal places and ensure no scientific notation
    const roundedValue = Number(cappedValue.toFixed(2));
    
    return `${sign}${roundedValue}%`;
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  // Render performance chart
  const renderPerformanceChart = () => {
    if (loading) {
      return <Skeleton className="h-[300px] w-full" />
    }

    if (!performanceData || !performanceData.chartData || performanceData.chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No performance data available.</p>
        </div>
      )
    }

    // Simple chart representation using divs
    const chartData = performanceData.chartData
    const maxValue = Math.max(...chartData.map((point: any) => point.value))
    const minValue = Math.min(...chartData.map((point: any) => point.value))
    const range = maxValue - minValue

    return (
      <div className="h-[300px] w-full relative">
        <div className="absolute inset-0 flex items-end">
          {chartData.map((point: any, index: number) => {
            const height = range > 0 ? ((point.value - minValue) / range) * 100 : 50
            const isPositive = point.value >= chartData[0].value
            
            return (
              <div key={index} className="flex-1 flex flex-col justify-end h-full px-1">
                <div 
                  className={`w-full ${isPositive ? 'bg-green-500' : 'bg-red-500'} rounded-t-sm`}
                  style={{ height: `${Math.max(5, height)}%` }}
                ></div>
                {index % Math.ceil(chartData.length / 10) === 0 && (
                  <div className="text-xs text-center mt-2 text-muted-foreground">
                    {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Render top performers
  const renderTopPerformers = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )
    }

    // If we have API data, use it
    if (performanceData && performanceData.topPerformers && performanceData.topPerformers.length > 0) {
      return (
        <div className="space-y-3">
          {performanceData.topPerformers.map((performer: any, index: number) => (
            <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-md">
              <div>
                <div className="font-medium">{performer.name}</div>
                <div className="text-sm text-muted-foreground">{performer.ticker || performer.type}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">{formatPercentage(performer.return)}</div>
                <div className="text-sm text-muted-foreground">{formatCurrency(performer.value)}</div>
              </div>
            </div>
          ))}
        </div>
      )
    }
    
    // Otherwise calculate from investment data
    if (investments && investments.length > 0) {
      // Calculate performance for each investment
      const performanceData = investments.map(investment => {
        const performance = calculateInvestmentPerformance(investment);
        return {
          ...investment,
          performance
        };
      });
      
      // Sort by percentage return (descending)
      const sortedInvestments = [...performanceData].sort((a, b) => 
        b.performance.percentReturn - a.performance.percentReturn
      );
      
      // Take top 5 performers
      const topPerformers = sortedInvestments.slice(0, 5);
      
      return (
        <div className="space-y-3">
          {topPerformers.map((performer, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-md">
              <div>
                <div className="font-medium">{performer.name}</div>
                <div className="text-sm text-muted-foreground">
                  {performer.ticker || performer.type}
                  {performer.performance.purchaseDate && (
                    <span className="ml-2">
                      Since {new Date(performer.performance.purchaseDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">
                  {formatPercentage(performer.performance.percentReturn)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(performer.performance.currentValue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="text-center py-3">
        <p className="text-muted-foreground">No performance data available.</p>
      </div>
    )
  }

  // Render bottom performers
  const renderBottomPerformers = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )
    }

    if (!performanceData || !performanceData.bottomPerformers || performanceData.bottomPerformers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-4">
          <p className="text-muted-foreground">No performance data available.</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {performanceData.bottomPerformers.map((investment: any, index: number) => (
          <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-md">
            <div>
              <div className="font-medium">{investment.name}</div>
              <div className="text-sm text-muted-foreground">{investment.ticker || 'N/A'}</div>
            </div>
            <div className={`text-lg font-semibold ${investment.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(investment.return)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investment Performance</h1>
        <p className="text-muted-foreground">Track and analyze your investment portfolio performance over time.</p>
      </div>
      <Separator />
      
      <div className="flex justify-end">
        <div className="inline-flex rounded-md shadow-sm">
          <Button 
            variant={timeframe === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('week')}
            className="rounded-l-md rounded-r-none"
          >
            1W
          </Button>
          <Button 
            variant={timeframe === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('month')}
            className="rounded-none border-l-0 border-r-0"
          >
            1M
          </Button>
          <Button 
            variant={timeframe === 'quarter' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('quarter')}
            className="rounded-none border-r-0"
          >
            3M
          </Button>
          <Button 
            variant={timeframe === 'year' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('year')}
            className="rounded-none border-r-0"
          >
            1Y
          </Button>
          <Button 
            variant={timeframe === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('all')}
            className="rounded-r-md rounded-l-none"
          >
            All
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>
              {timeframe === 'week' ? '1 Week' : 
               timeframe === 'month' ? '1 Month' : 
               timeframe === 'quarter' ? '3 Months' : 
               timeframe === 'year' ? '1 Year' : 'All Time'} Performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-4xl font-bold mb-2 flex items-center">
                    <span className={overallPerformance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatPercentage(overallPerformance.totalReturn)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Total Return</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold mb-1">
                    {formatPercentage(overallPerformance.annualizedReturn)}
                  </div>
                  <div className="text-sm text-muted-foreground">Annualized Return</div>
                </div>
              </div>
              
              {renderPerformanceChart()}
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Best performing investments</CardDescription>
          </CardHeader>
          <CardContent>
            {renderTopPerformers()}
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Bottom Performers</CardTitle>
            <CardDescription>Investments that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            {renderBottomPerformers()}
          </CardContent>
        </Card>
        
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Risk Metrics</CardTitle>
            <CardDescription>Portfolio risk and volatility analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Volatility</div>
                <div className="text-2xl font-semibold">{Number(overallPerformance.volatility.toFixed(2))}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {overallPerformance.volatility < 10 ? 'Low' : overallPerformance.volatility < 20 ? 'Medium' : 'High'} risk
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Standard deviation of returns, annualized
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Sharpe Ratio</div>
                <div className="text-2xl font-semibold">{Number(overallPerformance.sharpeRatio.toFixed(2))}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {overallPerformance.sharpeRatio < 1 ? 'Below average' : 
                   overallPerformance.sharpeRatio < 2 ? 'Good' : 'Excellent'} risk-adjusted return
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Excess return per unit of risk
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Beta</div>
                <div className="text-2xl font-semibold">
                  {Number(overallPerformance.beta.toFixed(2))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {overallPerformance.beta < 0.8 ? 'Less volatile than market' : 
                   overallPerformance.beta < 1.2 ? 'Similar to market' : 'More volatile than market'}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Sensitivity to market movements
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-start">
        <Button variant="outline" asChild>
          <Link href="/investments">Return to Investments</Link>
        </Button>
      </div>
    </div>
  )
}

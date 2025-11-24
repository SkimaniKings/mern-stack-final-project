"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { formatCurrency, formatPercentage } from "@/lib/utils"
import { RebalancingTable } from "@/components/investments/rebalancing-table"
import { RiskProfileSelector } from "@/components/investments/risk-profile-selector"
import { InvestmentList } from "@/components/investments/investment-list"

// Define interfaces for our data
interface Investment {
  id: string
  name: string
  ticker?: string
  type: string
  assetClass: string
  value: number
  allocation: number
  costBasis: number
  risk: "low" | "medium" | "high"
  purchaseDate?: string
  currentPrice?: number
  initialPrice?: number
}

interface AssetClass {
  id: string
  name: string
  targetAllocation: number
  currentAllocation: number
}

interface RiskProfile {
  id: string
  name: string
  description: string
  targetAllocations: Record<string, number>
}

interface RebalancingAction {
  assetClass: string
  action: 'buy' | 'sell'
  amount: number
  reason: string
  suggestions?: Array<{name: string, ticker?: string}>
}

// Sample risk profiles
const riskProfiles: RiskProfile[] = [
  {
    id: "conservative",
    name: "Conservative",
    description: "Lower risk, lower potential returns",
    targetAllocations: {
      Stocks: 20,
      Bonds: 50,
      Cash: 20,
      Alternative: 10,
    },
  },
  {
    id: "moderate",
    name: "Moderate",
    description: "Balanced risk and potential returns",
    targetAllocations: {
      Stocks: 40,
      Bonds: 40,
      Cash: 10,
      Alternative: 10,
    },
  },
  {
    id: "aggressive",
    name: "Aggressive",
    description: "Higher risk, higher potential returns",
    targetAllocations: {
      Stocks: 70,
      Bonds: 20,
      Cash: 5,
      Alternative: 5,
    },
  },
  {
    id: "very-aggressive",
    name: "Very Aggressive",
    description: "Highest risk, highest potential returns",
    targetAllocations: {
      Stocks: 85,
      Bonds: 10,
      Cash: 0,
      Alternative: 5,
    },
  },
]

// Sample investments (for fallback)
const sampleInvestments: Investment[] = [
  {
    id: "inv1",
    name: "Vanguard Total Stock Market ETF",
    ticker: "VTI",
    type: "ETF",
    assetClass: "Stocks",
    value: 10000,
    allocation: 0,
    costBasis: 9000,
    risk: "medium",
  },
  {
    id: "inv2",
    name: "Vanguard Total Bond Market ETF",
    ticker: "BND",
    type: "ETF",
    assetClass: "Bonds",
    value: 5000,
    allocation: 0,
    costBasis: 5100,
    risk: "low",
  },
  {
    id: "inv3",
    name: "Cash Reserve",
    type: "Cash",
    assetClass: "Cash",
    value: 2000,
    allocation: 0,
    costBasis: 2000,
    risk: "low",
  },
  {
    id: "inv4",
    name: "Bitcoin",
    ticker: "BTC",
    type: "Crypto",
    assetClass: "Alternative",
    value: 3000,
    allocation: 0,
    costBasis: 2000,
    risk: "high",
  },
]

// Force dynamic rendering to handle cookies
export const dynamic = 'force-dynamic'

export default function AssetAllocationPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRiskProfile, setSelectedRiskProfile] = useState<RiskProfile>(riskProfiles[1]) // Default to moderate
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([])
  const [activeTab, setActiveTab] = useState("current")

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        // Get real investments from the API
        const { getInvestments, getRebalancingRecommendations } = await import("@/app/actions/investments")
        const data = await getInvestments()
        
        if (data && Array.isArray(data)) {
          // Map API data to our Investment interface
          const mappedInvestments = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            ticker: item.ticker,
            type: item.type,
            assetClass: item.asset_type || "Other",
            value: item.value || 0,
            allocation: 0, // Will be calculated
            costBasis: item.cost_basis || 0,
            risk: item.risk_level || "medium",
            purchaseDate: item.purchase_date,
            currentPrice: item.current_price,
            initialPrice: item.initial_price,
          }))
          
          setInvestments(mappedInvestments)
          
          // Get rebalancing recommendations with the selected risk profile's target allocations
          const rebalancingData = await getRebalancingRecommendations(selectedRiskProfile.targetAllocations)
          
          if (rebalancingData) {
            // Update asset classes with current and target allocations
            const updatedAssetClasses = Object.keys(rebalancingData.targetAllocation).map(type => ({
              id: type,
              name: type,
              targetAllocation: rebalancingData.targetAllocation[type],
              currentAllocation: rebalancingData.currentAllocation[type] || 0
            }))
            
            setAssetClasses(updatedAssetClasses)
          } else {
            // Fallback to calculated allocation if rebalancing data is not available
            const assetClasses = calculateCurrentAllocation(mappedInvestments)
            setAssetClasses(assetClasses)
          }
        } else {
          // Fallback to sample data if API returns invalid data
          setInvestments(sampleInvestments)
          const assetClasses = calculateCurrentAllocation(sampleInvestments)
          setAssetClasses(assetClasses)
        }
      } catch (error) {
        console.error("Error fetching investments:", error)
        // Fallback to sample data on error
        setInvestments(sampleInvestments)
        const assetClasses = calculateCurrentAllocation(sampleInvestments)
        setAssetClasses(assetClasses)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedRiskProfile.targetAllocations])

  // Helper function to calculate current allocation based on investments
  function calculateCurrentAllocation(investments: Investment[]): AssetClass[] {
    // Calculate total portfolio value
    const totalValue = calculatePortfolioValue(investments)
    
    // Group investments by asset class
    const assetClassMap: Record<string, number> = {}
    
    investments.forEach(investment => {
      const assetClass = investment.assetClass
      if (!assetClassMap[assetClass]) {
        assetClassMap[assetClass] = 0
      }
      assetClassMap[assetClass] += investment.value
    })
    
    // Convert to array of AssetClass objects with percentages
    const assetClasses = Object.keys(assetClassMap).map(name => {
      const value = assetClassMap[name]
      const currentAllocation = totalValue > 0 ? (value / totalValue) * 100 : 0
      const targetAllocation = selectedRiskProfile.targetAllocations[name] || 0
      
      return {
        id: name,
        name,
        currentAllocation,
        targetAllocation
      }
    })
    
    return assetClasses
  }
  
  // Helper function to calculate rebalancing recommendations
  function calculateRebalancing(currentAssetClasses: AssetClass[], targetAllocations: Record<string, number>) {
    return currentAssetClasses.map(assetClass => {
      const targetAllocation = targetAllocations[assetClass.name] || 0
      const difference = targetAllocation - assetClass.currentAllocation
      
      return {
        ...assetClass,
        targetAllocation,
        difference
      }
    })
  }
  
  // Helper function to calculate specific rebalancing actions
  function calculateRebalancingActions(currentAssetClasses: AssetClass[], portfolioValue: number, targetAllocations: Record<string, number>): RebalancingAction[] {
    const actions: RebalancingAction[] = []
    
    // Calculate the difference between current and target allocations
    currentAssetClasses.forEach(assetClass => {
      const targetAllocation = targetAllocations[assetClass.name] || 0
      const currentAllocation = assetClass.currentAllocation
      const difference = targetAllocation - currentAllocation
      
      // Only create actions for significant differences (more than 2%)
      if (Math.abs(difference) >= 2) {
        const action: RebalancingAction = {
          assetClass: assetClass.name,
          action: difference > 0 ? 'buy' : 'sell',
          amount: Math.abs((difference / 100) * portfolioValue),
          reason: difference > 0 
            ? `Increase ${assetClass.name} allocation from ${currentAllocation.toFixed(1)}% to ${targetAllocation.toFixed(1)}%` 
            : `Decrease ${assetClass.name} allocation from ${currentAllocation.toFixed(1)}% to ${targetAllocation.toFixed(1)}%`,
          suggestions: getSuggestedInvestments(assetClass.name, difference > 0)
        }
        
        actions.push(action)
      }
    })
    
    // Handle asset classes that exist in target but not in current allocation
    Object.keys(targetAllocations).forEach(assetClass => {
      const exists = currentAssetClasses.some(current => current.name === assetClass)
      if (!exists && targetAllocations[assetClass] > 0) {
        const targetAllocation = targetAllocations[assetClass]
        const action: RebalancingAction = {
          assetClass: assetClass,
          action: 'buy',
          amount: (targetAllocation / 100) * portfolioValue,
          reason: `Add ${assetClass} to reach target allocation of ${targetAllocation.toFixed(1)}%`,
          suggestions: getSuggestedInvestments(assetClass, true)
        }
        
        actions.push(action)
      }
    })
    
    // Sort actions by amount (largest first)
    return actions.sort((a, b) => b.amount - a.amount)
  }

  // Helper function to get suggested investments for rebalancing
  function getSuggestedInvestments(assetClass: string, isBuying: boolean) {
    // Default suggestions for common asset classes
    const suggestions: Record<string, Array<{name: string, ticker?: string}>> = {
      Stocks: [
        { name: "Vanguard Total Stock Market ETF", ticker: "VTI" },
        { name: "iShares Core S&P 500 ETF", ticker: "IVV" },
        { name: "Schwab US Broad Market ETF", ticker: "SCHB" },
      ],
      Bonds: [
        { name: "Vanguard Total Bond Market ETF", ticker: "BND" },
        { name: "iShares Core US Aggregate Bond ETF", ticker: "AGG" },
        { name: "Schwab US Aggregate Bond ETF", ticker: "SCHZ" },
      ],
      Cash: [
        { name: "High-Yield Savings Account" },
        { name: "Money Market Fund" },
        { name: "Short-Term Treasury ETF", ticker: "SHV" },
      ],
      Alternative: [
        { name: "Vanguard Real Estate ETF", ticker: "VNQ" },
        { name: "iShares Gold Trust", ticker: "IAU" },
        { name: "Invesco DB Commodity Index Tracking Fund", ticker: "DBC" },
      ],
    }
    
    return suggestions[assetClass] || [{ name: `${assetClass} Index Fund` }]
  }
  
  // Helper function to calculate total portfolio value
  function calculatePortfolioValue(investments: Investment[]): number {
    return investments.reduce((total, investment) => total + investment.value, 0)
  }
  
  // Calculate total portfolio value
  const totalPortfolioValue = calculatePortfolioValue(investments)
  
  // Calculate rebalancing recommendations
  const rebalancingRecommendations = assetClasses.map(assetClass => ({
    assetClass: {
      id: assetClass.id,
      name: assetClass.name,
      targetAllocation: assetClass.targetAllocation,
      currentAllocation: assetClass.currentAllocation
    },
    targetAllocation: assetClass.targetAllocation,
    currentAllocation: assetClass.currentAllocation,
    difference: assetClass.targetAllocation - assetClass.currentAllocation,
    action: assetClass.targetAllocation > assetClass.currentAllocation 
      ? "buy" 
      : assetClass.targetAllocation < assetClass.currentAllocation 
        ? "sell" 
        : "hold",
    amountToRebalance: Math.abs((assetClass.targetAllocation - assetClass.currentAllocation) / 100 * totalPortfolioValue)
  }))
  
  // Calculate specific rebalancing actions
  const rebalancingActions = calculateRebalancingActions(
    assetClasses, 
    totalPortfolioValue, 
    selectedRiskProfile.targetAllocations
  )
  
  // Update risk profile
  async function handleRiskProfileChange(profile: RiskProfile) {
    setSelectedRiskProfile(profile)
    setLoading(true)
    
    try {
      // Get rebalancing recommendations with the new risk profile's target allocations
      const { getRebalancingRecommendations } = await import("@/app/actions/investments")
      const rebalancingData = await getRebalancingRecommendations(profile.targetAllocations)
      
      if (rebalancingData) {
        // Update asset classes with current and target allocations
        const updatedAssetClasses = Object.keys(rebalancingData.targetAllocation).map(type => ({
          id: type,
          name: type,
          targetAllocation: rebalancingData.targetAllocation[type],
          currentAllocation: rebalancingData.currentAllocation[type] || 0
        }))
        
        setAssetClasses(updatedAssetClasses)
      }
    } catch (error) {
      console.error("Error updating risk profile:", error)
    } finally {
      setLoading(false)
    }
  }

  // Update asset class target allocation
  function handleAssetClassUpdate(updatedAssetClass: AssetClass) {
    setAssetClasses(prev => 
      prev.map(ac => ac.id === updatedAssetClass.id ? updatedAssetClass : ac)
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Allocation</h1>
          <p className="text-muted-foreground">
            Optimize your investment portfolio based on your risk tolerance
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/investments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Investments
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Current Allocation</CardTitle>
              <CardDescription>
                Your current portfolio allocation by asset class
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">No investments found to analyze</p>
                  <Button asChild>
                    <Link href="/investments/add">Add Investments</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {assetClasses.map((assetClass) => (
                    <div key={assetClass.id} className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{assetClass.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(
                            (assetClass.currentAllocation / 100) * totalPortfolioValue
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 text-right">
                          {formatPercentage(assetClass.currentAllocation / 100)}
                        </div>
                        <div
                          className="h-2 w-24 rounded-full"
                          style={{
                            background: `linear-gradient(90deg, 
                              var(--primary) 0%, 
                              var(--primary) ${assetClass.currentAllocation}%, 
                              var(--muted) ${assetClass.currentAllocation}%, 
                              var(--muted) 100%)`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Portfolio Value</span>
                      <span className="font-bold">{formatCurrency(totalPortfolioValue)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Target vs. Current</CardTitle>
              <CardDescription>
                Compare your current allocation to your target
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground">Add investments to see comparison</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assetClasses.map((assetClass) => {
                    const difference = assetClass.targetAllocation - assetClass.currentAllocation
                    return (
                      <div key={assetClass.id} className="space-y-2">
                        <div className="flex justify-between">
                          <h4 className="font-medium">{assetClass.name}</h4>
                          <div className="flex space-x-2">
                            <span
                              className={
                                difference > 5
                                  ? "text-red-500"
                                  : difference < -5
                                  ? "text-amber-500"
                                  : "text-green-500"
                              }
                            >
                              {difference > 0 ? "+" : ""}
                              {difference.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${assetClass.currentAllocation}%` }}
                          />
                          <div
                            className="h-0.5 absolute mt-[-8px] rounded-full border-l-2 border-r-2 border-primary"
                            style={{
                              width: "4px",
                              marginLeft: `${assetClass.targetAllocation}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Current: {formatPercentage(assetClass.currentAllocation / 100)}</span>
                          <span>Target: {formatPercentage(assetClass.targetAllocation / 100)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="current">Risk Profile</TabsTrigger>
          <TabsTrigger value="rebalance">Rebalancing</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Profile</CardTitle>
              <CardDescription>Select your risk tolerance to set target allocations</CardDescription>
            </CardHeader>
            <CardContent>
              <RiskProfileSelector
                profiles={riskProfiles}
                selectedProfile={selectedRiskProfile}
                onSelectProfile={handleRiskProfileChange}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Target Asset Allocation</CardTitle>
              <CardDescription>Customize your target asset allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assetClasses.map((assetClass) => (
                  <div key={assetClass.id} className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{assetClass.name}</h4>
                      <p className="text-sm text-muted-foreground">Current: {formatPercentage(assetClass.currentAllocation / 100)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm">Target: {formatPercentage(assetClass.targetAllocation / 100)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rebalance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rebalancing Recommendations</CardTitle>
              <CardDescription>Actions to bring your portfolio in line with your target allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <RebalancingTable
                data={rebalancingRecommendations}
                portfolioValue={totalPortfolioValue}
              />
              
              {rebalancingActions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Specific Actions</h3>
                  <div className="space-y-4">
                    {rebalancingActions.map((action, index) => (
                      <div key={index} className="p-4 border rounded-md">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${action.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {action.action === 'buy' ? 'Buy' : 'Sell'}
                            </span>
                            <span className="ml-2 font-medium">{action.assetClass}</span>
                          </div>
                          <div className="font-bold">{formatCurrency(action.amount)}</div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{action.reason}</p>
                        {action.suggestions && action.suggestions.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium mb-1">Suggested investments:</p>
                            <ul className="text-xs text-muted-foreground">
                              {action.suggestions.map((suggestion, i) => (
                                <li key={i}>{suggestion.name} {suggestion.ticker ? `(${suggestion.ticker})` : ''}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Investments</CardTitle>
              <CardDescription>View and manage your investment holdings</CardDescription>
            </CardHeader>
            <CardContent>
              <InvestmentList data={investments} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

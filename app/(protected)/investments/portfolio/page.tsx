"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  type Investment,
  type AssetClass,
  calculateCurrentAllocation,
  calculatePerformance,
  calculateTaxEfficiency,
  formatCurrency,
} from "@/lib/investments/calculations"
import { PortfolioAllocationChart } from "@/components/investments/portfolio-allocation-chart"
import { PortfolioSummaryMetrics } from "@/components/investments/portfolio-summary-metrics"
import { PortfolioInvestmentTable } from "@/components/investments/portfolio-investment-table"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { getInvestments, getAssetClasses } from "@/app/actions/investments"
import { AddInvestmentForm } from "@/components/investments/add-investment-form"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

// Define a type for the investment data from the database
interface DatabaseInvestment {
  id: string
  user_id: string
  name: string
  ticker?: string
  type?: string
  value: number
  cost_basis: number
  quantity?: number
  initial_price?: number
  current_price?: number
  allocation?: number
  currency?: string
  created_at?: string
  updated_at?: string
  categories?: { id: string; name: string; color: string } | null
  accounts?: { id: string; name: string; type: string } | null
}

// Function to convert database investments to the format used by the UI
function convertDatabaseInvestments(dbInvestments: DatabaseInvestment[]): Investment[] {
  return dbInvestments.map(inv => ({
    id: inv.id,
    name: inv.name,
    ticker: inv.ticker || "",
    assetClass: inv.type || "Other", // Map type to assetClass for the UI components
    value: inv.value || 0,
    costBasis: inv.cost_basis || 0,
    shares: inv.quantity || 0,
    initialPrice: inv.initial_price || 0,
    currentPrice: inv.current_price || 0,
    taxLocation: inv.accounts?.type === "Roth IRA" || inv.accounts?.type === "HSA" ? "tax_free" : 
                 inv.accounts?.type === "401k" || inv.accounts?.type === "IRA" ? "tax_deferred" : "taxable",
    account: inv.accounts?.name || "Default",
    category: inv.categories?.name || "",
    currency: inv.currency || "USD",
    gain: (inv.value || 0) - (inv.cost_basis || 0),
    gainPercent: inv.cost_basis ? ((inv.value || 0) - inv.cost_basis) / inv.cost_basis * 100 : 0,
    yield: 0, // We don't have this data yet
    risk: "medium", // Default risk level
  }));
}

// Function to create asset classes from investment types
function createAssetClasses(investments: Investment[], assetClassTypes: string[]): AssetClass[] {
  // Create a map to group investments by type
  const investmentsByType: Record<string, Investment[]> = {};
  
  // Initialize with all possible types
  assetClassTypes.forEach(type => {
    investmentsByType[type] = [];
  });
  
  // Group investments by type
  investments.forEach(inv => {
    const type = inv.assetClass || "Other";
    if (!investmentsByType[type]) {
      investmentsByType[type] = [];
    }
    investmentsByType[type].push(inv);
  });
  
  // Create asset classes
  return Object.entries(investmentsByType).map(([type, invs], index) => ({
    id: `asset-class-${index}`,
    name: type,
    targetAllocation: 0, // Will be calculated later
    currentAllocation: 0, // Will be calculated later
    investments: invs,
  }));
}

export default function PortfolioOverviewPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([])
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Function to refresh data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Fetch investments and asset classes
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch investments from the database
        const dbInvestments = await getInvestments();
        const convertedInvestments = convertDatabaseInvestments(dbInvestments);
        setInvestments(convertedInvestments);
        
        // Fetch asset class types
        const assetClassTypes = await getAssetClasses();
        
        // Calculate current allocation using the built-in function
        const calculatedAssetClasses = calculateCurrentAllocation(convertedInvestments);
        setAssetClasses(calculatedAssetClasses);
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching portfolio data:", err);
        setError("Failed to load portfolio data. Please try again later.");
        setLoading(false);
      }
    }
    
    fetchData();
  }, [refreshTrigger]); // Add refreshTrigger to the dependency array

  // Calculate performance metrics
  const performanceMetrics = investments.length > 0 ? calculatePerformance(investments) : {
    totalValue: 0,
    totalCost: 0,
    totalGain: 0,
    totalGainPercent: 0,
    weightedExpenseRatio: 0,
    weightedDividendYield: 0
  };

  // Calculate tax efficiency
  const taxEfficiency = investments.length > 0 ? calculateTaxEfficiency(investments) : {
    taxableValue: 0,
    taxDeferredValue: 0,
    taxFreeValue: 0,
    taxEfficiencyScore: 0,
    recommendations: []
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Overview</h1>
            <p className="text-muted-foreground mt-2">Loading your investment portfolio...</p>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Portfolio Allocation</CardTitle>
              <CardDescription>Loading asset allocation...</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-64 w-64 rounded-full" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio Summary</CardTitle>
              <CardDescription>Loading metrics...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio Overview</h1>
            <p className="text-muted-foreground mt-2">Error loading portfolio</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-destructive">Error</h2>
              <p className="mt-2">{error}</p>
              <Button className="mt-4" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Overview</h1>
          <p className="text-muted-foreground mt-2">Comprehensive view of your investment portfolio</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/investments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Investments
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
            <CardDescription>Current asset allocation of your portfolio</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {assetClasses.length > 0 ? (
              <PortfolioAllocationChart assetClasses={assetClasses} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-muted-foreground">No investments to display</p>
                <AddInvestmentForm className="mt-4" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Summary</CardTitle>
            <CardDescription>Key metrics for your investment portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <PortfolioSummaryMetrics performanceMetrics={performanceMetrics} taxEfficiency={taxEfficiency} />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">All Investments</TabsTrigger>
          <TabsTrigger value="asset-classes">By Asset Class</TabsTrigger>
          <TabsTrigger value="accounts">By Account</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Investment Portfolio</CardTitle>
                  <CardDescription>All your investment holdings</CardDescription>
                </div>
                <AddInvestmentForm onInvestmentAdded={refreshData} />
              </div>
            </CardHeader>
            <CardContent>
              {investments.length > 0 ? (
                <PortfolioInvestmentTable 
                  investments={investments} 
                  onInvestmentUpdated={refreshData}
                  onInvestmentDeleted={refreshData}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You don't have any investments yet</p>
                  <AddInvestmentForm onInvestmentAdded={refreshData} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="asset-classes" className="space-y-4">
          {assetClasses.length > 0 ? (
            assetClasses.map((assetClass) => (
              <Card key={assetClass.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{assetClass.name}</CardTitle>
                      <CardDescription>
                        {formatCurrency(assetClass.investments.reduce((sum, inv) => sum + inv.value, 0))} (
                        {assetClass.currentAllocation.toFixed(1)}% of portfolio)
                      </CardDescription>
                    </div>
                    <AddInvestmentForm onInvestmentAdded={refreshData} />
                  </div>
                </CardHeader>
                <CardContent>
                  {assetClass.investments.length > 0 ? (
                    <PortfolioInvestmentTable 
                      investments={assetClass.investments} 
                      onInvestmentUpdated={refreshData}
                      onInvestmentDeleted={refreshData}
                    />
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No investments in this asset class</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">No asset classes found</p>
                  <AddInvestmentForm onInvestmentAdded={refreshData} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          {/* Group investments by account */}
          {(() => {
            // Get unique accounts
            const accounts = [...new Set(investments.map(inv => inv.account))];
            
            if (accounts.length === 0) {
              return (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-4">No accounts found</p>
                      <AddInvestmentForm onInvestmentAdded={refreshData} />
                    </div>
                  </CardContent>
                </Card>
              );
            }
            
            return accounts.map(account => {
              const accountInvestments = investments.filter(inv => inv.account === account);
              const accountValue = accountInvestments.reduce((sum, inv) => sum + inv.value, 0);
              
              return (
                <Card key={account}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>{account}</CardTitle>
                        <CardDescription>
                          {formatCurrency(accountValue)} (
                          {performanceMetrics && performanceMetrics.totalValue > 0 
                            ? ((accountValue / performanceMetrics.totalValue) * 100).toFixed(1) 
                            : "0.0"}% of portfolio)
                        </CardDescription>
                      </div>
                      <AddInvestmentForm onInvestmentAdded={refreshData} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PortfolioInvestmentTable 
                      investments={accountInvestments} 
                      onInvestmentUpdated={refreshData}
                      onInvestmentDeleted={refreshData}
                    />
                  </CardContent>
                </Card>
              );
            });
          })()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

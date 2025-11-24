'use client'

import React, { useState } from 'react'
import { PerformanceChart } from './PerformanceChart'
import { CorrelationHeatmap } from './CorrelationHeatmap'
import { EfficientFrontier } from './EfficientFrontier'
import { FeeAnalysis } from './FeeAnalysis'
import { MarketContext } from './MarketContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getPortfolioPerformance, getPortfolioCorrelation, getEfficientFrontier, getInvestmentFees, getMarketContext, saveDashboardPreferences, getDashboardPreferences } from '@/app/actions/investments'
import { seedInvestmentData } from '@/app/actions/seed-investment-data'
import { Loader2, RefreshCw } from 'lucide-react'

export default function PortfolioVisualizations() {
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('all')
  const [preferences, setPreferences] = useState({
    risk_display_mode: 'simple',
    preferred_view: 'simplified',
    show_market_context: true
  })
  
  // State for all the data
  const [performanceData, setPerformanceData] = useState({
    performanceData: [],
    totalReturn: 0,
    annualizedReturn: 0,
    startValue: 0,
    endValue: 0
  })
  
  const [correlationData, setCorrelationData] = useState({
    assets: [],
    correlationMatrix: []
  })
  
  const [frontierData, setFrontierData] = useState({
    frontierPoints: [],
    currentPortfolio: null
  })
  
  const [feeData, setFeeData] = useState({
    feeImpact: [],
    feesByType: {},
    totalAnnualFees: 0,
    potentialSavings: 0
  })
  
  const [marketData, setMarketData] = useState({
    currentIndicators: [],
    historicalData: {},
    showMarketContext: true
  })
  
  // Error and empty states
  const [error, setError] = useState<string | null>(null)
  const [isEmpty, setIsEmpty] = useState(false)

  // Load all data on initial render
  React.useEffect(() => {
    // Set up loading state
    setLoading(true)
    setError(null)
    
    // Create an AbortController to handle cleanup
    const controller = new AbortController()
    const signal = controller.signal
    
    // Define an async function to load everything
    const initializeComponent = async () => {
      try {
        // First load preferences as they affect what data we load
        await loadPreferences()
        
        // Only proceed if the component is still mounted
        if (!signal.aborted) {
          await loadAllData()
        }
      } catch (error) {
        // Only update state if the component is still mounted
        if (!signal.aborted) {
          console.error('Error initializing portfolio component:', error)
          setError('Failed to initialize portfolio data')
        }
      } finally {
        // Only update state if the component is still mounted
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    }
    
    // Start the initialization process
    initializeComponent()
    
    // Cleanup function to handle component unmounting
    return () => {
      controller.abort()
      // Clear any timeouts that might be pending
      const timeoutIds = setTimeout(() => {}, 0)
      for (let i = 0; i < timeoutIds; i++) {
        clearTimeout(i)
      }
    }
  }, [])

  // Default preferences if none are found
  const defaultPreferences = {
    risk_display_mode: 'simple',
    preferred_view: 'simplified',
    show_market_context: true
  }

  // Load user preferences
  const loadPreferences = async () => {
    try {
      const userPreferences = await getDashboardPreferences()
      
      // If we got valid preferences, use them
      if (userPreferences && typeof userPreferences === 'object') {
        setPreferences({
          ...defaultPreferences, // Fallback for any missing properties
          ...userPreferences // Override with user's saved preferences
        })
      } else {
        // Use defaults if no preferences found
        console.log('No saved preferences found, using defaults')
        setPreferences(defaultPreferences)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      // Use defaults if error occurs
      setPreferences(defaultPreferences)
    }
  }

  // Load all data
  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [performance, correlation, frontier, fees, market] = await Promise.all([
        getPortfolioPerformance(timeframe),
        getPortfolioCorrelation(),
        getEfficientFrontier(),
        getInvestmentFees(),
        getMarketContext()
      ])
      
      setPerformanceData(performance)
      setCorrelationData(correlation)
      setFrontierData(frontier)
      setFeeData(fees)
      setMarketData(market)
      
      // Check if there's any investment data
      const hasData = 
        performance.performanceData.length > 0 || 
        correlation.assets.length > 0 || 
        frontier.frontierPoints.length > 0;
      
      setIsEmpty(!hasData)
    } catch (error) {
      console.error("Error loading portfolio data:", error)
      setError("Failed to load investment data. Please try again or contact support if the issue persists.")
    } finally {
      setLoading(false)
    }
  }

  // Handle timeframe change
  const handleTimeframeChange = async (newTimeframe: 'week' | 'month' | 'quarter' | 'year' | 'all') => {
    setTimeframe(newTimeframe)
    try {
      setLoading(true)
      const performance = await getPortfolioPerformance(newTimeframe)
      setPerformanceData(performance)
      
      // Check if there's any performance data
      if (!performance.performanceData || performance.performanceData.length === 0) {
        console.warn("No performance data available for the selected timeframe")
      }
    } catch (error) {
      console.error("Error loading performance data:", error)
      setError("Failed to load performance data for the selected timeframe")
      // Auto-clear the error after 5 seconds
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  // Handle preference changes
  const handlePreferenceChange = async (key: string, value: any) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    try {
      await saveDashboardPreferences(newPreferences)
      
      // If market context preference changed, update the data
      if (key === 'show_market_context') {
        try {
          const market = await getMarketContext()
          setMarketData(market)
        } catch (marketError) {
          console.error("Error fetching market context:", marketError)
          // Don't show error for this as it's not critical
        }
      }
    } catch (error) {
      console.error("Error saving preferences:", error)
      // Revert the preference change in the UI since it failed to save
      setPreferences(preferences)
      setError("Failed to save your preferences. Please try again.")
      // Auto-clear the error after 5 seconds
      setTimeout(() => setError(null), 5000)
    }
  }

  // Seed sample data
  const handleSeedData = async () => {
    setSeeding(true)
    setError(null)
    try {
      const result = await seedInvestmentData()
      if (result.success) {
        // Reload all data after seeding
        await loadAllData()
        // Show success toast or message here if you have a toast component
      } else {
        // Handle failure
        setError(result.message || "Failed to generate sample data")
      }
    } catch (error) {
      console.error("Error seeding investment data:", error)
      setError("An unexpected error occurred while generating sample data")
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investment Portfolio</h1>
          <p className="text-muted-foreground">
            Visualize and analyze your investment performance and allocation
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <Button 
            variant="outline" 
            onClick={loadAllData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Data
          </Button>
          
          <Button 
            variant="default" 
            onClick={handleSeedData}
            disabled={seeding || loading}
          >
            {seeding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              "Generate Sample Data"
            )}
          </Button>
        </div>
      </div>
      
      {error && (
        <Card className="bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-destructive p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </div>
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {isEmpty && !error && (
        <Card>
          <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-1">No investment data found</h3>
            <p className="text-muted-foreground mb-4">You don't have any investments in your portfolio yet.</p>
            <Button onClick={handleSeedData} disabled={seeding}>Generate Sample Data</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Dashboard Preferences</CardTitle>
            <CardDescription>Customize how your investment data is displayed</CardDescription>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-market-context" className="font-medium">Market Context</Label>
                <Switch 
                  id="show-market-context" 
                  checked={preferences.show_market_context}
                  onCheckedChange={(checked) => handlePreferenceChange('show_market_context', checked)}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">Show economic indicators that may affect your investments</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="risk-display" className="font-medium">Risk Display Mode</Label>
              <Select 
                value={preferences.risk_display_mode}
                onValueChange={(value) => handlePreferenceChange('risk_display_mode', value)}
                disabled={loading}
              >
                <SelectTrigger id="risk-display">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Choose how risk metrics are presented</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preferred-view" className="font-medium">Preferred View</Label>
              <Select 
                value={preferences.preferred_view}
                onValueChange={(value) => handlePreferenceChange('preferred_view', value)}
                disabled={loading}
              >
                <SelectTrigger id="preferred-view">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simplified">Simplified</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Set your preferred level of detail</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="performance" className="space-y-6" onValueChange={(value) => {
        // You could track active tab for analytics or save user preference
        console.log(`User switched to ${value} tab`)
      }}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="performance" disabled={loading || isEmpty}>
            <span className="flex items-center gap-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Performance
            </span>
          </TabsTrigger>
          <TabsTrigger value="allocation" disabled={loading || isEmpty}>
            <span className="flex items-center gap-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Allocation
            </span>
          </TabsTrigger>
          <TabsTrigger value="efficient-frontier" disabled={loading || isEmpty}>
            <span className="flex items-center gap-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Efficient Frontier
            </span>
          </TabsTrigger>
          <TabsTrigger value="fees" disabled={loading || isEmpty}>
            <span className="flex items-center gap-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Fee Analysis
            </span>
          </TabsTrigger>
          <TabsTrigger value="market" disabled={loading || !preferences.show_market_context}>
            <span className="flex items-center gap-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Market Context
            </span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <PerformanceChart 
              performanceData={performanceData.performanceData}
              totalReturn={performanceData.totalReturn}
              annualizedReturn={performanceData.annualizedReturn}
              startValue={performanceData.startValue}
              endValue={performanceData.endValue}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="allocation" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <CorrelationHeatmap 
              assets={correlationData.assets}
              correlationMatrix={correlationData.correlationMatrix}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="efficient-frontier" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <EfficientFrontier 
              frontierPoints={frontierData.frontierPoints}
              currentPortfolio={frontierData.currentPortfolio}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="fees" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <FeeAnalysis 
              feeImpact={feeData.feeImpact}
              feesByType={feeData.feesByType}
              totalAnnualFees={feeData.totalAnnualFees}
              potentialSavings={feeData.potentialSavings}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="market" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <MarketContext 
              currentIndicators={marketData.currentIndicators}
              historicalData={marketData.historicalData}
              showMarketContext={marketData.showMarketContext}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

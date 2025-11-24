"use client"

import { useState, useEffect, useRef } from "react"
import { WatchlistTable } from "@/components/investments/watchlist-table"
import { AddToWatchlist } from "@/components/investments/add-to-watchlist"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RefreshCw, Filter, Bell, TrendingUp, Percent, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export type WatchlistItem = {
  id: string
  ticker: string
  name: string
  price: number
  target_price: number | null
  notes: string
  sector: string
  created_at: string
  updated_at: string
  price_alert_enabled: boolean
  alert_threshold: number | null
  previous_close?: number
  price_change?: number
  price_change_percent?: number
  day_high?: number
  day_low?: number
  last_updated?: string
}

type WatchlistContentProps = {
  initialItems: WatchlistItem[]
}

export function WatchlistContent({ initialItems = [] }: WatchlistContentProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [items, setItems] = useState<WatchlistItem[]>(initialItems)
  const [filteredItems, setFilteredItems] = useState<WatchlistItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [selectedPerformance, setSelectedPerformance] = useState<string>('all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  // Use a ref to keep track of the previous items length to prevent state resets
  const prevItemsRef = useRef<WatchlistItem[]>([])
  const isInitialRender = useRef(true)

  // Get all available sectors from the items
  const sectors = ['all', ...Array.from(new Set(items.filter(item => item.sector).map(item => item.sector)))]

  // Calculate min and max price for the range slider
  useEffect(() => {
    if (items.length > 0) {
      const prices = items.map(item => item.price).filter(price => !isNaN(price))
      if (prices.length > 0) {
        const minPrice = Math.floor(Math.min(...prices))
        const maxPrice = Math.ceil(Math.max(...prices)) + 100
        setPriceRange([minPrice, maxPrice])
      }
    }
  }, [items])

  // Update items state when initialItems change
  useEffect(() => {
    console.log('WatchlistContent received initialItems:', initialItems.length);
    
    // Only update items if we have initialItems or this is the initial render
    if (initialItems.length > 0 || isInitialRender.current) {
      // Store the current items in the ref for comparison
      prevItemsRef.current = [...initialItems];
      
      // Update the items state
      setItems(initialItems);
      
      // Mark that we've completed the initial render
      isInitialRender.current = false;
    }
  }, [initialItems]); // Only depend on initialItems, not items
  
  // Separate effect to handle empty state
  useEffect(() => {
    // If items were reset to empty but we had items before, restore from the ref
    if (items.length === 0 && prevItemsRef.current.length > 0) {
      console.log('Preventing items from disappearing, restoring from ref:', prevItemsRef.current.length);
      setItems([...prevItemsRef.current]);
    }
  }, [items.length]);

  // Filter items based on search query, sector, and performance
  useEffect(() => {
    console.log('Filtering items, current count:', items.length);
    let filtered = [...items]

    // Filter by tab
    if (activeTab === 'alerts') {
      filtered = filtered.filter(item => item.price_alert_enabled)
    } else if (activeTab === 'targets') {
      filtered = filtered.filter(item => item.target_price !== null)
    } else if (activeTab === 'gainers') {
      filtered = filtered.filter(item => (item.price_change_percent || 0) > 0)
        .sort((a, b) => (b.price_change_percent || 0) - (a.price_change_percent || 0))
    } else if (activeTab === 'losers') {
      filtered = filtered.filter(item => (item.price_change_percent || 0) < 0)
        .sort((a, b) => (a.price_change_percent || 0) - (b.price_change_percent || 0))
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        item => item.ticker.toLowerCase().includes(query) || 
               item.name.toLowerCase().includes(query) ||
               (item.notes && item.notes.toLowerCase().includes(query))
      )
    }

    // Filter by sector
    if (selectedSector !== 'all') {
      filtered = filtered.filter(item => item.sector === selectedSector)
    }

    // Filter by performance
    if (selectedPerformance !== 'all') {
      if (selectedPerformance === 'gainers') {
        filtered = filtered.filter(item => (item.price_change_percent || 0) > 0)
      } else if (selectedPerformance === 'losers') {
        filtered = filtered.filter(item => (item.price_change_percent || 0) < 0)
      } else if (selectedPerformance === 'targets') {
        filtered = filtered.filter(item => item.target_price !== null)
      }
    }

    // Filter by price alerts
    if (showOnlyAlerts) {
      filtered = filtered.filter(item => item.price_alert_enabled)
    }

    setFilteredItems(filtered)
  }, [items, searchQuery, selectedSector, selectedPerformance, showOnlyAlerts, activeTab])

  // Refresh stock prices
  const refreshPrices = async () => {
    setIsRefreshing(true)
    try {
      // Simply fetch the latest watchlist items from our API
      const response = await fetch('/api/watchlist/items', {
        method: 'GET',
        credentials: 'include', // Important for sending cookies
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // Ensure we get fresh data
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error:', response.status, errorText)
        throw new Error(`Failed to refresh prices: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Map the API response items to match the expected WatchlistItem interface
        const updatedItems: WatchlistItem[] = data.items.map((item: any) => ({
          id: item.id,
          ticker: item.ticker,
          name: item.name,
          price: item.price || 0,
          target_price: item.target_price || null,
          notes: item.notes || "",
          sector: item.sector || "",
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
          price_alert_enabled: Boolean(item.price_alert_enabled || false),
          alert_threshold: item.alert_threshold || null,
          previous_close: item.previous_close || null,
          price_change: item.price_change || null,
          price_change_percent: item.price_change_percent || null,
          day_high: item.day_high || null,
          day_low: item.day_low || null,
          last_updated: item.last_updated || new Date().toISOString(),
          alert_triggered: Boolean(item.alert_triggered || false)
        }))
        
        // Update the items with the new prices
        setItems(updatedItems)
        toast.success('Prices refreshed successfully')
        
        // Check for price alerts
        const alertItems = updatedItems.filter((item: WatchlistItem) => 
          item.price_alert_enabled && 
          item.alert_threshold !== null && 
          ((item.price >= item.alert_threshold) || 
           (item.previous_close && item.previous_close < item.alert_threshold && item.price >= item.alert_threshold))
        )
        
        // Show alerts if any
        if (alertItems.length > 0) {
          alertItems.forEach((item: WatchlistItem) => {
            toast(
              `Price Alert: ${item.ticker}`,
              {
                description: `${item.name} has reached your alert threshold of $${item.alert_threshold?.toFixed(2)}`,
                action: {
                  label: "View",
                  onClick: () => setActiveTab('alerts')
                },
                icon: <AlertTriangle className="h-4 w-4" />,
                duration: 5000,
              }
            )
          })
        }
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error refreshing prices:', error)
      toast.error('Failed to refresh prices. Please try again.')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Auto-refresh prices every 30 minutes (reduced frequency to prevent excessive refreshing)
  useEffect(() => {
    // Only refresh if we have items and this is not an initial render
    if (items.length > 0 && !isInitialRender.current) {
      // Set up interval for auto-refresh - no initial refresh to prevent constant refreshing
      const intervalId = setInterval(refreshPrices, 30 * 60 * 1000) // 30 minutes
      
      // Clean up on unmount
      return () => clearInterval(intervalId)
    }
  }, []) // Only run once on component mount

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Investment Watchlist</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshPrices}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
          </Button>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="targets">
              <TrendingUp className="h-4 w-4 mr-2" />
              Targets
            </TabsTrigger>
            <TabsTrigger value="gainers">
              <Percent className="h-4 w-4 mr-2 text-green-500" />
              Gainers
            </TabsTrigger>
            <TabsTrigger value="losers">
              <Percent className="h-4 w-4 mr-2 text-red-500" />
              Losers
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Filter Investments</CardTitle>
                <CardDescription>
                  Narrow down your watchlist to find specific investments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Search</Label>
                    <Input
                      id="search"
                      placeholder="Search by ticker or name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sector">Sector</Label>
                    <Select value={selectedSector} onValueChange={setSelectedSector}>
                      <SelectTrigger id="sector">
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.map((sector) => (
                          <SelectItem key={sector} value={sector}>
                            {sector === 'all' ? 'All Sectors' : sector}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="performance">Performance</Label>
                    <Select value={selectedPerformance} onValueChange={setSelectedPerformance}>
                      <SelectTrigger id="performance">
                        <SelectValue placeholder="Select performance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="gainers">Gainers</SelectItem>
                        <SelectItem value="losers">Losers</SelectItem>
                        <SelectItem value="targets">With Targets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 flex items-center">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="alerts-only"
                        checked={showOnlyAlerts}
                        onCheckedChange={setShowOnlyAlerts}
                      />
                      <Label htmlFor="alerts-only" className="cursor-pointer">
                        Show only with alerts
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Price Alerts</CardTitle>
                <CardDescription>
                  Investments with active price alert notifications
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
          
          <TabsContent value="targets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Target Prices</CardTitle>
                <CardDescription>
                  Investments with target prices set
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
          
          <TabsContent value="gainers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Gainers</CardTitle>
                <CardDescription>
                  Investments with positive price movement
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
          
          <TabsContent value="losers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Losers</CardTitle>
                <CardDescription>
                  Investments with negative price movement
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <WatchlistTable 
        items={filteredItems} 
        onAddNew={() => setIsAddDialogOpen(true)} 
      />
      
      <AddToWatchlist 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Calculator, RefreshCw, TrendingUp, TrendingDown, AlertCircle, Clock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Subscription } from "@/types/subscription"



export const dynamic = "force-dynamic"

interface ROIData {
  id: string
  name: string
  service_provider: string
  amount: number
  currency: string
  recurrence: string
  start_date: string
  end_date: string | null
  expected_roi: number | null
  actual_roi: number | null
  category: string
  total_cost: number
  monthly_cost: number
  roi_percentage: number
  roi_ratio: number
  break_even_months: number | null
  subscription_status: "active" | "paused" | "cancelled" | string
  roi_status: "positive" | "negative" | "neutral" | "pending" | string
}

export default function ROICalculatorPage() {
  const router = useRouter()
  
  // State
  const [subscriptions, setSubscriptions] = useState<ROIData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  
  // Fetch subscription ROI data
  const fetchROIData = async () => {
    try {
      setLoading(true)
      
      const response = await fetch("/api/subscriptions/roi")
      
      if (!response.ok) {
        throw new Error("Failed to fetch ROI data")
      }
      
      const data = await response.json()
      setSubscriptions(data)
    } catch (error) {
      console.error("Error fetching ROI data:", error)
      toast.error("Failed to load ROI data")
    } finally {
      setLoading(false)
    }
  }
  
  // Initial fetch
  useEffect(() => {
    fetchROIData()
  }, [])
  
  // Format currency
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }
  
  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "positive":
        return "bg-green-500"
      case "negative":
        return "bg-red-500"
      case "neutral":
        return "bg-yellow-500"
      case "pending":
      default:
        return "bg-gray-400"
    }
  }
  
  // Get ROI status badge
  const getROIStatusBadge = (roiStatus: string) => {
    switch (roiStatus) {
      case "positive":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <TrendingUp key="trending-up-icon" className="h-3 w-3 mr-1" />
            <span key="positive-text">Positive ROI</span>
          </Badge>
        )
      case "negative":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <TrendingDown key="trending-down-icon" className="h-3 w-3 mr-1" />
            <span key="negative-text">Negative ROI</span>
          </Badge>
        )
      case "neutral":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertCircle key="alert-circle-icon" className="h-3 w-3 mr-1" />
            <span key="neutral-text">Break-even</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock key="clock-icon" className="h-3 w-3 mr-1" />
            <span key="pending-text">Add More Data To Calculate ROI</span>
          </Badge>
        )
    }
  }
  
  // Get subscription status badge
  const getSubscriptionStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <span key="active-text">Active</span>
          </Badge>
        )
      case "paused":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <span key="paused-text">Paused</span>
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <span key="cancelled-text">Cancelled</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <span key="unknown-text">Unknown</span>
          </Badge>
        )
    }
  }
  
  // Filter subscriptions based on active tab
  const filteredSubscriptions = subscriptions.filter(sub => {
    if (activeTab === "all") return true
    if (activeTab === "active") return sub.subscription_status === "active"
    if (activeTab === "paused") return sub.subscription_status === "paused"
    if (activeTab === "cancelled") return sub.subscription_status === "cancelled"
    if (activeTab === "positive") return sub.roi_status === "positive"
    if (activeTab === "negative") return sub.roi_status === "negative"
    return true
  })
  
  // Calculate summary statistics
  const calculateSummary = () => {
    if (subscriptions.length === 0) return null
    
    const totalMonthlySpend = subscriptions.reduce((sum, sub) => sum + sub.monthly_cost, 0)
    const positiveROICount = subscriptions.filter(sub => sub.status === "positive").length
    const negativeROICount = subscriptions.filter(sub => sub.status === "negative").length
    const pendingROICount = subscriptions.filter(sub => sub.status === "pending").length
    
    const averageROI = subscriptions.reduce((sum, sub) => {
      // Only include subscriptions with actual ROI data
      if (sub.roi_percentage !== null && sub.status !== "pending") {
        return sum + sub.roi_percentage
      }
      return sum
    }, 0) / (subscriptions.length - pendingROICount || 1) // Avoid division by zero
    
    return {
      totalMonthlySpend,
      positiveROICount,
      negativeROICount,
      pendingROICount,
      averageROI: isNaN(averageROI) ? 0 : averageROI,
    }
  }
  
  const summary = calculateSummary()
  
  // Render skeletons during loading
  const renderSkeletons = () => {
    return Array(3).fill(0).map((_, index) => (
      <Card key={index} className="mb-4">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    ))
  }
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ROI Calculator</h1>
          <p className="text-muted-foreground">
            Analyze the return on investment for your subscriptions
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchROIData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
          
          <Button
            onClick={() => router.push("/subscriptions/active")}
            className="flex items-center gap-2"
          >
            Manage Subscriptions
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Summary Card */}
      {!loading && summary && (
        <Card>
          <CardHeader>
            <CardTitle>ROI Summary</CardTitle>
            <CardDescription>
              Overview of your subscription investments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">Monthly Spend</div>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalMonthlySpend)}</div>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">Average ROI</div>
                <div className="text-2xl font-bold">{formatPercentage(summary.averageROI)}</div>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">Positive ROI</div>
                <div className="text-2xl font-bold">
                  {summary.positiveROICount} 
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    of {subscriptions.length} subscriptions
                  </span>
                </div>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">Negative ROI</div>
                <div className="text-2xl font-bold">
                  {summary.negativeROICount}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    of {subscriptions.length} subscriptions
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* ROI Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>ROI Analysis</CardTitle>
          <CardDescription>
            Detailed analysis of each subscription's return on investment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Subscriptions</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="paused">Paused</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              <TabsTrigger value="positive">Positive ROI</TabsTrigger>
              <TabsTrigger value="negative">Negative ROI</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                renderSkeletons()
              ) : filteredSubscriptions.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Subscriptions Found</AlertTitle>
                  <AlertDescription>
                    {activeTab === "all" 
                      ? "You don't have any subscriptions yet. Add one to start tracking ROI."
                      : `You don't have any subscriptions with ${activeTab} ROI.`}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {/* Subscription Cards - Show name and provider prominently */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {filteredSubscriptions.map((sub, index) => (
                      <Card 
                        key={`card-${sub.id || index}`} 
                        className={`border-l-4 ${getStatusColor(sub.status).replace('bg-', 'border-')}`}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">
                            {sub.name || 'Unnamed Subscription'}
                          </CardTitle>
                          <CardDescription>
                            {sub.service_provider || 'No provider specified'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-muted-foreground">Monthly Cost</div>
                              <div className="font-medium">{formatCurrency(sub.monthly_cost, sub.currency)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">ROI</div>
                              <div className="font-medium">
                                {sub.status !== "pending" 
                                  ? formatPercentage(sub.roi_percentage)
                                  : "Pending"}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Break-even</div>
                              <div className="font-medium">
                                {sub.break_even_months !== null 
                                  ? `${sub.break_even_months.toFixed(1)} months`
                                  : "N/A"}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Subscription Status</div>
                              <div>{getSubscriptionStatusBadge(sub.subscription_status || 'active')}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">ROI Status</div>
                              <div>{getROIStatusBadge(sub.roi_status || 'pending')}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Detailed Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead key="th-subscription">Subscription</TableHead>
                        <TableHead key="th-provider">Provider</TableHead>
                        <TableHead key="th-cost">Monthly Cost</TableHead>
                        <TableHead key="th-roi">ROI</TableHead>
                        <TableHead key="th-breakeven">Break-even</TableHead>
                        <TableHead key="th-sub-status">Subscription Status</TableHead>
                        <TableHead key="th-roi-status">ROI Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscriptions.map((sub, index) => (
                        <TableRow key={`row-${sub.id || index}`}>
                          <TableCell key={`name-${sub.id || index}`} className="font-medium">
                            {sub.name || 'Unnamed Subscription'}
                          </TableCell>
                          <TableCell key={`provider-${sub.id || index}`}>
                            {sub.service_provider || 'No provider specified'}
                          </TableCell>
                          <TableCell key={`cost-${sub.id || index}`}>
                            {formatCurrency(sub.monthly_cost, sub.currency)}
                          </TableCell>
                          <TableCell key={`roi-${sub.id || index}`}>
                            {sub.status !== "pending" 
                              ? formatPercentage(sub.roi_percentage)
                              : "Pending"}
                          </TableCell>
                          <TableCell key={`breakeven-${sub.id || index}`}>
                            {sub.break_even_months !== null 
                              ? `${sub.break_even_months.toFixed(1)} months`
                              : "N/A"}
                          </TableCell>
                          <TableCell key={`sub-status-${sub.id || index}`}>
                            {getSubscriptionStatusBadge(sub.subscription_status || 'active')}
                          </TableCell>
                          <TableCell key={`roi-status-${sub.id || index}`}>
                            {getROIStatusBadge(sub.roi_status || 'pending')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* ROI Calculation Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>How ROI is Calculated</CardTitle>
          <CardDescription>
            Understanding the metrics behind your subscription ROI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              id: "roi-percentage",
              title: "ROI Percentage",
              description: "ROI% = ((Actual Return - Total Cost) / Total Cost) × 100"
            },
            {
              id: "roi-ratio",
              title: "ROI Ratio",
              description: "ROI Ratio = Actual Return / Total Cost"
            },
            {
              id: "break-even",
              title: "Break-even Point",
              description: "Break-even Months = Total Cost / (Expected Monthly Return)"
            },
            {
              id: "monthly-cost",
              title: "Monthly Cost",
              description: "Calculated based on the subscription amount and recurrence type (monthly, yearly, etc.)"
            },
            {
              id: "subscription-details",
              title: "Subscription Details",
              description: "Each subscription's name and service provider are displayed to help you identify your services easily"
            }
          ].map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <div className="bg-blue-100 text-blue-800 rounded-full p-1 mt-0.5">
                <Calculator key={`calc-icon-${item.id}`} className="h-4 w-4" />
              </div>
              <div>
                <h3 key={`title-${item.id}`} className="font-medium">{item.title}</h3>
                <p key={`desc-${item.id}`} className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}

        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, RefreshCw, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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

interface OverlappingCategory {
  category: string
  service_provider: string // For backward compatibility
  subscriptions: {
    id: string
    name: string
    amount: number
    currency: string
    category: string
    service_provider: string | null
    provider?: string
    start_date: string
    end_date: string | null
    billing_cycle?: string
    billing_frequency?: string
    recurrence?: string
    status?: string
    is_active?: boolean
    usage_value?: number
    usage_frequency?: string
    usage_level?: string
  }[]
  count: number
}

export default function DuplicatesPage() {
  const router = useRouter()
  
  // State
  const [overlappingCategories, setOverlappingCategories] = useState<OverlappingCategory[]>([])
  const [loading, setLoading] = useState(true)
  
  // Fetch overlapping subscriptions
  const fetchOverlappingSubscriptions = async () => {
    try {
      setLoading(true)
      console.log('Fetching overlapping subscriptions...')
      
      const response = await fetch("/api/subscriptions/overlap", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add a client-id header to help with authentication
          'client-id': localStorage.getItem('client-id') || '00000000-0000-0000-0000-000000000000'
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API error (${response.status}):`, errorText)
        throw new Error(`Failed to fetch overlapping subscriptions: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Duplicate subscriptions by category:', data)
      
      if (!Array.isArray(data)) {
        console.error('Invalid data format received:', data)
        throw new Error('Invalid data format received from API')
      }
      
      setOverlappingCategories(data)
    } catch (error) {
      console.error("Error fetching overlapping subscriptions:", error)
      toast.error(error instanceof Error ? error.message : "Failed to load duplicate subscriptions")
    } finally {
      setLoading(false)
    }
  }
  
  // Initial fetch
  useEffect(() => {
    fetchOverlappingSubscriptions()
  }, [])
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  // Calculate overlap status
  const getOverlapStatus = (sub1: any, sub2: any) => {
    const start1 = new Date(sub1.start_date)
    const end1 = sub1.end_date ? new Date(sub1.end_date) : null
    const start2 = new Date(sub2.start_date)
    const end2 = sub2.end_date ? new Date(sub2.end_date) : null
    
    // Both ongoing (no end date)
    if (!end1 && !end2) {
      return "Both subscriptions are ongoing with no end date"
    }
    
    // One ongoing, one with end date
    if (!end1 && end2) {
      if (start1 <= end2) {
        return "Overlapping: First subscription continues beyond second subscription's end date"
      } else {
        return "No overlap: First subscription starts after second subscription ends"
      }
    }
    
    if (end1 && !end2) {
      if (start2 <= end1) {
        return "Overlapping: Second subscription continues beyond first subscription's end date"
      } else {
        return "No overlap: Second subscription starts after first subscription ends"
      }
    }
    
    // Both have end dates
    if (end1 && end2) {
      if (start1 <= end2 && start2 <= end1) {
        return "Overlapping: Subscription periods intersect"
      } else {
        return "No overlap: Subscription periods do not intersect"
      }
    }
    
    return "Unable to determine overlap status"
  }
  
  // Calculate total potential savings
  const calculatePotentialSavings = () => {
    let totalDuplicates = 0
    let potentialMonthlySavings = 0
    
    overlappingCategories.forEach(category => {
      // Count all but one subscription as duplicates
      const duplicateCount = category.count - 1
      totalDuplicates += duplicateCount
      
      // Calculate potential monetary savings
      if (duplicateCount > 0 && category.subscriptions.length > 1) {
        // Sort subscriptions by amount (ascending)
        const sortedSubs = [...category.subscriptions].sort((a, b) => a.amount - b.amount)
        
        // Keep the most expensive one (assuming it's the most feature-rich)
        // and calculate savings from eliminating others
        for (let i = 0; i < sortedSubs.length - 1; i++) {
          const sub = sortedSubs[i]
          let monthlyAmount = sub.amount
          
          // Convert to monthly amount based on billing cycle
          switch (sub.billing_cycle) {
            case "weekly":
              monthlyAmount = sub.amount * 4.33 // Average weeks in a month
              break
            case "biweekly":
              monthlyAmount = sub.amount * 2.17 // Average bi-weeks in a month
              break
            case "quarterly":
              monthlyAmount = sub.amount / 3
              break
            case "semiannually":
              monthlyAmount = sub.amount / 6
              break
            case "annually":
              monthlyAmount = sub.amount / 12
              break
          }
          
          potentialMonthlySavings += monthlyAmount
        }
      }
    })
    
    return {
      count: totalDuplicates,
      monthlySavings: Math.round(potentialMonthlySavings * 100) / 100,
      annualSavings: Math.round(potentialMonthlySavings * 12 * 100) / 100
    }
  }
  
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
          <h1 className="text-3xl font-bold tracking-tight">Duplicate Detection</h1>
          <p className="text-muted-foreground">
            Find and manage overlapping subscription services
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchOverlappingSubscriptions}
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
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Subscription Analysis</CardTitle>
          <CardDescription>
            We've analyzed your subscriptions to find potential duplicates and overlapping services
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : overlappingCategories.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Duplicates Found</AlertTitle>
              <AlertDescription>
                Great job! We didn't find any duplicate or overlapping subscriptions.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Potential Duplicates Detected</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    We found {overlappingCategories.length} categor{overlappingCategories.length !== 1 ? 'ies' : 'y'} with multiple subscriptions,
                    totaling {calculatePotentialSavings().count} potential duplicate{calculatePotentialSavings().count !== 1 ? 's' : ''}.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 mt-2">
                    <div className="bg-red-100 text-red-800 p-3 rounded-md flex-1">
                      <div className="font-semibold">Monthly Savings Potential</div>
                      <div className="text-xl font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(calculatePotentialSavings().monthlySavings)}
                      </div>
                    </div>
                    <div className="bg-red-100 text-red-800 p-3 rounded-md flex-1">
                      <div className="font-semibold">Annual Savings Potential</div>
                      <div className="text-xl font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(calculatePotentialSavings().annualSavings)}
                      </div>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Duplicates List */}
      {!loading && overlappingCategories.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Detected Duplicates by Category</h2>
          
          <Accordion type="single" collapsible className="w-full">
            {overlappingCategories.map((category, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="font-medium capitalize">{category.category}</span>
                    <span className="text-sm text-muted-foreground">
                      ({category.count} subscriptions)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Subscription Details</CardTitle>
                      <CardDescription>
                        You have multiple subscriptions in the <span className="capitalize">{category.category}</span> category
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Billing</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Usage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {category.subscriptions.map((sub) => {
                            // Determine usage level for styling
                            let usageLevel = "medium";
                            let usageValue = sub.usage_value;
                            let usageColor = "text-blue-600 bg-blue-50";
                            
                            if (typeof usageValue === 'number') {
                              if (usageValue >= 7 && usageValue <= 10) {
                                usageLevel = "high";
                                usageColor = "text-green-600 bg-green-50";
                              } else if (usageValue >= 4 && usageValue <= 6) {
                                usageLevel = "medium";
                                usageColor = "text-blue-600 bg-blue-50";
                              } else if (usageValue >= 1 && usageValue <= 3) {
                                usageLevel = "low";
                                usageColor = "text-red-600 bg-red-50";
                              }
                            } else if (sub.usage_frequency) {
                              if (sub.usage_frequency === "high") {
                                usageColor = "text-green-600 bg-green-50";
                              } else if (sub.usage_frequency === "medium") {
                                usageColor = "text-blue-600 bg-blue-50";
                              } else if (sub.usage_frequency === "low") {
                                usageColor = "text-red-600 bg-red-50";
                              }
                            }
                            
                            // Determine status color
                            const statusColor = sub.status === 'cancelled' || sub.is_active === false ?
                              'text-red-600 bg-red-50' :
                              sub.status === 'paused' ?
                              'text-yellow-600 bg-yellow-50' :
                              'text-green-600 bg-green-50';
                            
                            return (
                              <TableRow key={sub.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">{sub.name}</TableCell>
                                <TableCell>{sub.service_provider || sub.provider || 'N/A'}</TableCell>
                                <TableCell className="font-semibold">
                                  {typeof sub.amount === 'number' ? 
                                    new Intl.NumberFormat('en-US', { 
                                      style: 'currency', 
                                      currency: sub.currency || 'USD',
                                      minimumFractionDigits: 2
                                    }).format(sub.amount) : 
                                    `${sub.amount || 0} ${sub.currency || 'USD'}`
                                  }
                                </TableCell>
                                <TableCell>
                                  {sub.billing_cycle ? sub.billing_cycle.replace(/_/g, " ") : 
                                   sub.billing_frequency ? sub.billing_frequency.replace(/_/g, " ") : 
                                   sub.recurrence ? sub.recurrence.replace(/_/g, " ") : 
                                   "Monthly"}
                                </TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                    {sub.status || (sub.is_active ? "Active" : "Inactive")}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${usageColor}`}>
                                    {typeof usageValue === 'number' ? 
                                      `${usageLevel} (${usageValue}/10)` : 
                                      sub.usage_frequency || usageLevel}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                    <CardFooter className="flex flex-col items-start">
                      <h4 className="font-medium mb-2">Duplicate Analysis</h4>
                      <div className="space-y-4 w-full">
                        {/* Potential Savings Calculation */}
                        {(() => {
                          // Calculate potential savings for this category
                          let potentialMonthlySavings = 0;
                          let highestCostSub = null;
                          
                          // Sort subscriptions by amount (ascending)
                          const sortedSubs = [...category.subscriptions].sort((a, b) => a.amount - b.amount);
                          
                          // Find the most expensive subscription (likely the most feature-rich)
                          if (sortedSubs.length > 0) {
                            highestCostSub = sortedSubs[sortedSubs.length - 1];
                          }
                          
                          // Calculate savings from eliminating all but the most expensive one
                          for (let i = 0; i < sortedSubs.length - 1; i++) {
                            const sub = sortedSubs[i];
                            let monthlyAmount = sub.amount;
                            
                            // Convert to monthly amount based on billing cycle
                            switch (sub.billing_cycle) {
                              case "weekly":
                                monthlyAmount = sub.amount * 4.33;
                                break;
                              case "biweekly":
                                monthlyAmount = sub.amount * 2.17;
                                break;
                              case "quarterly":
                                monthlyAmount = sub.amount / 3;
                                break;
                              case "semiannually":
                                monthlyAmount = sub.amount / 6;
                                break;
                              case "annually":
                                monthlyAmount = sub.amount / 12;
                                break;
                            }
                            
                            potentialMonthlySavings += monthlyAmount;
                          }
                          
                          const annualSavings = potentialMonthlySavings * 12;
                          
                          return (
                            <div className="space-y-4">
                              <Alert variant="destructive" className="py-3">
                                <div className="flex flex-col space-y-2">
                                  <div className="font-medium text-base">
                                    Potential Savings Opportunity
                                  </div>
                                  <div>
                                    You have {category.count} subscriptions in the <span className="capitalize">{category.category}</span> category. 
                                    Consider consolidating or canceling redundant services to save money.
                                  </div>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                    <div className="bg-white/20 p-2 rounded-md">
                                      <div className="text-sm font-medium">Monthly Savings</div>
                                      <div className="text-lg font-bold">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(potentialMonthlySavings)}
                                      </div>
                                    </div>
                                    <div className="bg-white/20 p-2 rounded-md">
                                      <div className="text-sm font-medium">Annual Savings</div>
                                      <div className="text-lg font-bold">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(annualSavings)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Alert>
                              
                              {/* Recommendation */}
                              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                                <div className="flex flex-col space-y-2">
                                  <div className="font-medium">
                                    Recommended Action
                                  </div>
                                  <div className="text-sm">
                                    {highestCostSub ? (
                                      <>
                                        Consider keeping <strong>{highestCostSub.name}</strong> which appears to be your most feature-rich subscription 
                                        in this category, and evaluate canceling the others to save 
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(annualSavings)} annually.
                                      </>
                                    ) : (
                                      <>Review all subscriptions in this category and consider consolidating to a single service.</>  
                                    )}
                                  </div>
                                </div>
                              </Alert>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div className="w-full mt-4 flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => router.push("/subscriptions/active")}
                        >
                          Manage Subscriptions
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => window.open("https://www.truebill.com/cancel-subscriptions", "_blank")}
                        >
                          Cancel Services
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
      
      {/* Recommendations */}
      {!loading && overlappingCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Tips to optimize your subscription spending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <div className="bg-amber-100 text-amber-800 rounded-full p-1 mt-0.5">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-medium">Review Overlapping Subscriptions</h3>
                <p className="text-sm text-muted-foreground">
                  Consider if you need multiple subscriptions from the same provider. You might be able to consolidate
                  to a single plan or find a better deal.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="bg-amber-100 text-amber-800 rounded-full p-1 mt-0.5">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-medium">Check for Bundle Opportunities</h3>
                <p className="text-sm text-muted-foreground">
                  Some providers offer bundle discounts when combining multiple services. This could save you money
                  compared to separate subscriptions.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="bg-amber-100 text-amber-800 rounded-full p-1 mt-0.5">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-medium">Consider Family or Group Plans</h3>
                <p className="text-sm text-muted-foreground">
                  If you have multiple individual subscriptions, check if a family or group plan would be more cost-effective.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

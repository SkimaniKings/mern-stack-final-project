"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SubscriptionDialog } from "@/components/subscriptions/subscription-dialog"
import { getSubscriptions, deleteSubscription } from "@/app/actions/subscriptions"
import { formatCurrency } from "@/lib/utils"
import { Calendar, Plus, Edit, Trash2, AlertCircle, ExternalLink } from "lucide-react"

interface Subscription {
  id: string
  name: string
  provider: string
  amount: number
  billing_cycle?: string
  billing_frequency?: string
  next_billing_date?: string
  next_payment_date?: string
  status?: string
  auto_renew?: boolean
  auto_pay?: boolean
  usage_frequency?: string
  usage_value?: number
  usage_level?: string
  cancellation_url?: string | null
  payment_method?: string
  categories?: { name: string; color: string }
  payment_methods?: { name: string; type: string }
  biller?: {
    id?: string
    name?: string
    category?: string
    website_url?: string
    support_contact?: string
  }
  // Additional properties needed for the component
  service_provider?: string
  currency?: string
  category?: string
  recurrence?: string
  next_renewal_date?: string
  is_active?: boolean
}

export function SubscriptionsList() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalMonthly, setTotalMonthly] = useState(0)
  const [openDialog, setOpenDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null)

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        console.log("Fetching subscriptions from UI component...")
        const data = await getSubscriptions()
        console.log("Received data in UI component:", JSON.stringify(data, null, 2))
        console.log("Data type:", typeof data)
        console.log("Is array?", Array.isArray(data))
        console.log("Length:", data?.length || 0)

        // Check if data is valid before setting state
        if (data && Array.isArray(data)) {
          setSubscriptions(data)
          calculateTotalMonthly(data)
        } else {
          console.error("Received invalid data format from getSubscriptions")
          setError("Invalid data format received")
        }
      } catch (err) {
        setError("Error fetching subscriptions")
        console.error("Error in fetchSubscriptions:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchSubscriptions()
  }, [])

  const calculateTotalMonthly = (subs: Subscription[]) => {
    let total = 0

    subs.forEach((sub) => {
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

      total += monthlyAmount
    })

    setTotalMonthly(Math.round(total * 100) / 100)
  }

  const handleAddSubscription = () => {
    setSelectedSubscription(null)
    setOpenDialog(true)
  }

  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    setOpenDialog(true)
  }

  const handleDeleteSubscription = (id: string) => {
    setSubscriptionToDelete(id)
    setOpenDeleteDialog(true)
  }

  const confirmDeleteSubscription = async () => {
    if (!subscriptionToDelete) return

    try {
      await deleteSubscription(subscriptionToDelete)
      const updatedSubscriptions = subscriptions.filter((sub) => sub.id !== subscriptionToDelete)
      setSubscriptions(updatedSubscriptions)
      calculateTotalMonthly(updatedSubscriptions)
      setOpenDeleteDialog(false)
      setSubscriptionToDelete(null)
    } catch (err) {
      console.error("Error deleting subscription:", err)
    }
  }

  const handleSaveSubscription = async () => {
    // Refresh subscriptions list
    try {
      const data = await getSubscriptions()
      setSubscriptions(data)
      calculateTotalMonthly(data)
      setOpenDialog(false)
    } catch (err) {
      console.error("Error refreshing subscriptions:", err)
    }
  }

  const getUsageFrequencyBadge = (frequency: string, usageValue?: number) => {
    // If we have a numeric usage value, use that for color coding (1-3: red, 4-6: blue, 7-10: green)
    if (typeof usageValue === 'number') {
      if (usageValue >= 7 && usageValue <= 10) {
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 font-medium">
            High Usage ({usageValue}/10)
          </Badge>
        )
      } else if (usageValue >= 4 && usageValue <= 6) {
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-medium">
            Medium Usage ({usageValue}/10)
          </Badge>
        )
      } else if (usageValue >= 1 && usageValue <= 3) {
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 font-medium">
            Low Usage ({usageValue}/10)
          </Badge>
        )
      } else {
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 font-medium">
            No Usage (0/10)
          </Badge>
        )
      }
    }
    
    // Fallback to string-based frequency if no numeric value
    switch (frequency) {
      case "high":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 font-medium">
            High Usage
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-medium">
            Medium Usage
          </Badge>
        )
      case "low":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 font-medium">
            Low Usage
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 font-medium">
            Unknown Usage
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold tracking-tight">Subscriptions</h2>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
        </div>
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold tracking-tight">Subscriptions</h2>
          <Button onClick={handleAddSubscription}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => setLoading(true)}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold tracking-tight">Subscriptions</h2>
        <Button onClick={handleAddSubscription}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="font-medium">No subscriptions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first subscription to start tracking your recurring expenses.
            </p>
            <Button variant="outline" className="mt-4" onClick={handleAddSubscription}>
              <Plus className="mr-2 h-4 w-4" />
              Add Subscription
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>Total monthly cost: {formatCurrency(totalMonthly)}</CardDescription>
            </CardHeader>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscriptions.map((subscription) => {
              // Determine usage level for card styling
              let usageLevel = "medium";
              let usageValue = subscription.usage_value;
              let cardBorderColor = "border-blue-200";
              
              if (typeof usageValue === 'number') {
                if (usageValue >= 7 && usageValue <= 10) {
                  usageLevel = "high";
                  cardBorderColor = "border-green-200";
                } else if (usageValue >= 4 && usageValue <= 6) {
                  usageLevel = "medium";
                  cardBorderColor = "border-blue-200";
                } else if (usageValue >= 1 && usageValue <= 3) {
                  usageLevel = "low";
                  cardBorderColor = "border-red-200";
                }
              } else if (subscription.usage_frequency) {
                if (subscription.usage_frequency === "high") {
                  cardBorderColor = "border-green-200";
                } else if (subscription.usage_frequency === "medium") {
                  cardBorderColor = "border-blue-200";
                } else if (subscription.usage_frequency === "low") {
                  cardBorderColor = "border-red-200";
                }
              }
              
              return (
                <Card 
                  key={subscription.id} 
                  className={`border-l-4 ${cardBorderColor} hover:shadow-md transition-shadow duration-200`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{subscription.name}</CardTitle>
                        <CardDescription>
                          {subscription.provider || subscription.biller?.name || subscription.service_provider || "Unknown Provider"}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(subscription.amount)}</div>
                        <div className="text-xs text-muted-foreground">{subscription.currency || "USD"}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0">
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">CATEGORY</div>
                        <Badge variant="outline" className="capitalize">
                          {subscription.categories?.name || subscription.category || subscription.biller?.category || "Other"}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">BILLING</div>
                        <div className="capitalize text-sm">
                          {subscription.billing_cycle ? subscription.billing_cycle.replace(/_/g, " ") : 
                           subscription.billing_frequency ? subscription.billing_frequency.replace(/_/g, " ") : 
                           subscription.recurrence ? subscription.recurrence.replace(/_/g, " ") : "Monthly"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">NEXT DUE DATE</div>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-1 h-3 w-3 text-muted-foreground" />
                          {subscription.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString() : 
                           subscription.next_payment_date ? new Date(subscription.next_payment_date).toLocaleDateString() : 
                           subscription.next_renewal_date ? new Date(subscription.next_renewal_date).toLocaleDateString() : 
                           "No date available"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">STATUS</div>
                        <Badge 
                          variant="outline" 
                          className={`${subscription.status === 'cancelled' || subscription.is_active === false ? 
                            'bg-red-100 text-red-800 border-red-300' : 
                            subscription.status === 'paused' ? 
                            'bg-yellow-100 text-yellow-800 border-yellow-300' : 
                            'bg-green-100 text-green-800 border-green-300'} font-medium`}
                        >
                          {subscription.status || (subscription.is_active ? "Active" : "Inactive")}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-between items-center">
                      <div>
                        {getUsageFrequencyBadge(
                          subscription.usage_frequency || 
                          (typeof subscription.usage_value === 'number' ? 
                            (subscription.usage_value > 6 ? 'high' : subscription.usage_value > 3 ? 'medium' : 'low') : 
                            subscription.usage_level || "medium"),
                          subscription.usage_value
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {subscription.cancellation_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <a href={subscription.cancellation_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditSubscription(subscription)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteSubscription(subscription.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <SubscriptionDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        subscription={selectedSubscription}
        onSave={handleSaveSubscription}
      />

      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this subscription and remove it from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSubscription} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

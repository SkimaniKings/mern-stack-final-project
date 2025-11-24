"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, AlertTriangle, Calendar, FileText, CreditCard, BarChart3, Settings, Loader2 } from "lucide-react"
import { SubscriptionCard } from "./subscription-card"
import { BillNegotiationAssistant } from "./bill-negotiation-assistant"
import { SubscriptionROICalculator } from "./subscription-roi-calculator"
import { SmartPaymentScheduler } from "./smart-payment-scheduler"
import { DuplicateServiceDetector } from "./duplicate-service-detector"
import { PriceIncreaseAlerts } from "./price-increase-alerts"
import { SubscriptionCancellation } from "./subscription-cancellation"
import { PaymentTimeline } from "./payment-timeline"
import { SubscriptionValueMatrix } from "./subscription-value-matrix"
import { BillChangeTracker } from "./bill-change-tracker"
import { PaymentMethodDistribution } from "./payment-method-distribution"
import { SubscriptionForm } from "./subscription-form"
import { supabaseClient } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { createSubscription, updateSubscription, deleteSubscription } from "@/app/actions/subscriptions"


export function SubscriptionManager() {
  const [activeTab, setActiveTab] = useState("overview")
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState(null)
  
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Fetch subscriptions from Supabase
  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        setLoading(true)
        
        // Get the current user
        const { data: { user } } = await supabaseClient.auth.getUser()
        
        if (!user) {
          throw new Error('User not authenticated')
        }
        
        // Fetch subscriptions from the database
        const { data, error: fetchError } = await supabaseClient
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('next_billing_date', { ascending: true })
        
        if (fetchError) {
          throw fetchError
        }
        
        // Transform the data to match our application's structure
        const transformedData = data.map(sub => ({
          id: sub.id,
          name: sub.name,
          category: sub.category || 'Other',
          cost: parseFloat(sub.amount) || 0,
          billingCycle: sub.billing_cycle || 'monthly',
          nextBillingDate: sub.next_billing_date ? new Date(sub.next_billing_date) : new Date(),
          usage: sub.usage_score || 50, // Default to 50% if not set
          value: sub.value_score || 50, // Default to 50% if not set
          paymentMethod: sub.payment_method || 'Credit Card',
          autoRenew: sub.auto_renew !== false, // Default to true
          notes: sub.notes || ''
        }))
        
        setSubscriptions(transformedData)
      } catch (err) {
        console.error('Error fetching subscriptions:', err)
        setError(err.message || 'Failed to load subscriptions')
      } finally {
        setLoading(false)
      }
      nextBillingDate: new Date(2023, 6, 22),
      usage: 75,
      value: 70,
      paymentMethod: "Credit Card",
      autoRenew: true,
      notes: "2TB storage plan"
    },
    {
      id: "11",
      name: "YNAB",
      category: "Finance",
      cost: 14.99,
      billingCycle: "monthly",
      nextBillingDate: new Date(2023, 7, 3),
      usage: 80,
      value: 85,
      paymentMethod: "Credit Card",
      autoRenew: true,
      notes: "Budgeting software"
    },
    {
      id: "12",
      name: "Calm",
      category: "Health",
      cost: 69.99,
      billingCycle: "annually",
      nextBillingDate: new Date(2024, 1, 15),
      usage: 30,
      value: 50,
      paymentMethod: "Credit Card",
      autoRenew: true,
      notes: "Meditation and sleep stories"
    }
  ]
  
  const totalMonthlyCost = subscriptions.reduce((total, sub) => {
    if (sub.billingCycle === "monthly") {
      return total + sub.cost
    } else if (sub.billingCycle === "weekly") {
      return total + (sub.cost * 4.33) // Average weeks per month
    } else if (sub.billingCycle === "biweekly") {
      return total + (sub.cost * 2.17) // Average bi-weeks per month
    } else if (sub.billingCycle === "quarterly") {
      return total + (sub.cost / 3)
    } else if (sub.billingCycle === "semi-annually") {
      return total + (sub.cost / 6)
    } else if (sub.billingCycle === "annually") {
      return total + (sub.cost / 12)
    }
    return total
  }, 0)
  
  const upcomingPayments = subscriptions
    .filter(sub => {
      const today = new Date()
      const nextBilling = new Date(sub.nextBillingDate)
      const daysUntilBilling = Math.ceil((nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilBilling <= 30
    })
    .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())
  
  const lowUsageSubscriptions = subscriptions.filter(sub => sub.usage < 50)
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bill & Subscription Management</CardTitle>
            <CardDescription>
              Track, analyze, and optimize your recurring bills and subscriptions
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Monthly Cost</p>
                    <p className="text-2xl font-bold">${totalMonthlyCost.toFixed(2)}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Upcoming Payments</p>
                    <p className="text-2xl font-bold">{upcomingPayments.length}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-2">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Low Usage Alerts</p>
                    <p className="text-2xl font-bold">{lowUsageSubscriptions.length}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="negotiation">Negotiation</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="cancellation">Cancellation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Subscriptions</CardTitle>
                <CardDescription>
                  Manage your active subscriptions and recurring bills
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    // Loading state
                    Array(3).fill(0).map((_, i) => (
                      <div key={`skeleton-${i}`} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-8 w-16 rounded-full" />
                        </div>
                        <div className="mt-4 space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    ))
                  ) : error ? (
                    // Error state
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : subscriptions.length === 0 ? (
                    // Empty state
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">You don't have any active subscriptions</p>
                      <Button onClick={() => setShowAddForm(true)} variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Subscription
                      </Button>
                    </div>
                  ) : (
                    // Subscriptions list
                    subscriptions.map(subscription => (
                      <SubscriptionCard 
                        key={subscription.id} 
                        subscription={subscription} 
                        onEdit={(sub) => {
                          // Handle edit subscription
                          setSelectedSubscription(sub);
                          setShowAddForm(true);
                        }}
                        onDelete={(id) => {
                          // Handle delete subscription
                          if (confirm('Are you sure you want to delete this subscription?')) {
                            deleteSubscription(id).then(() => {
                              setSubscriptions(subscriptions.filter(s => s.id !== id));
                            });
                          }
                        }}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Timeline</CardTitle>
                  <CardDescription>
                    Optimized payment schedule for better cash flow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentTimeline subscriptions={upcomingPayments} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Value Matrix</CardTitle>
                  <CardDescription>
                    Cost vs. usage analysis for your subscriptions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SubscriptionValueMatrix subscriptions={subscriptions} />
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bill Change Tracker</CardTitle>
                <CardDescription>
                  Historical price increases and changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BillChangeTracker subscriptions={subscriptions} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Distribution</CardTitle>
                <CardDescription>
                  Optimize your payment methods for maximum rewards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodDistribution subscriptions={subscriptions} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="negotiation">
          <BillNegotiationAssistant subscriptions={subscriptions} />
        </TabsContent>
        
        <TabsContent value="roi">
          <SubscriptionROICalculator subscriptions={subscriptions} />
        </TabsContent>
        
        <TabsContent value="scheduling">
          <SmartPaymentScheduler subscriptions={subscriptions} />
        </TabsContent>
        
        <TabsContent value="duplicates">
          <DuplicateServiceDetector subscriptions={subscriptions} />
        </TabsContent>
        
        <TabsContent value="alerts">
          <PriceIncreaseAlerts subscriptions={subscriptions} />
        </TabsContent>
        
        <TabsContent value="cancellation">
          <SubscriptionCancellation subscriptions={subscriptions} />
        </TabsContent>
      </Tabs>
      
      {showAddForm && (
        <SubscriptionForm 
          subscription={selectedSubscription}
          onClose={() => {
            setShowAddForm(false);
            setSelectedSubscription(null);
          }} 
          onSave={async (subscription) => {
            try {
              let result;
              
              if (subscription.id) {
                // Update existing subscription
                result = await updateSubscription(subscription);
                setSubscriptions(subscriptions.map(s => 
                  s.id === subscription.id ? { ...s, ...subscription } : s
                ));
              } else {
                // Create new subscription
                result = await createSubscription(subscription);
                setSubscriptions([...subscriptions, { ...subscription, id: result.id }]);
              }
              
              setShowAddForm(false);
              setSelectedSubscription(null);
            } catch (err) {
              console.error('Error saving subscription:', err);
              alert('Failed to save subscription. Please try again.');
            }
          }} 
        />
      )}
    </div>
  )
} 
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, RefreshCw, Calendar } from "lucide-react"
import Link from "next/link"
import { ExpenseList } from "@/components/expenses/expense-list"
import { SubscriptionCalendar } from "@/components/expenses/subscription-calendar"
import { RecurringExpenseSummary } from "@/components/expenses/recurring-expense-summary"

export default function RecurringTransactionsPage() {
  const [activeTab, setActiveTab] = useState<string>("subscriptions")

  // Sample recurring transactions data
  const recurringTransactions = [
    {
      id: "1",
      merchant: "Netflix",
      category: "Entertainment",
      amount: 15.99,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      recurring: {
        frequency: "monthly" as const,
        nextDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      },
    },
    {
      id: "2",
      merchant: "Spotify",
      category: "Entertainment",
      amount: 9.99,
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      recurring: {
        frequency: "monthly" as const,
        nextDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      },
    },
    {
      id: "3",
      merchant: "Gym Membership",
      category: "Health & Fitness",
      amount: 49.99,
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      recurring: {
        frequency: "monthly" as const,
        nextDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    },
    {
      id: "4",
      merchant: "Adobe Creative Cloud",
      category: "Software",
      amount: 52.99,
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      recurring: {
        frequency: "monthly" as const,
        nextDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
    },
    {
      id: "5",
      merchant: "iCloud Storage",
      category: "Software",
      amount: 2.99,
      date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      recurring: {
        frequency: "monthly" as const,
        nextDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    },
    {
      id: "6",
      merchant: "Amazon Prime",
      category: "Shopping",
      amount: 119.0,
      date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      recurring: {
        frequency: "yearly" as const,
        nextDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000),
      },
    },
    {
      id: "7",
      merchant: "Car Insurance",
      category: "Insurance",
      amount: 89.0,
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      recurring: {
        frequency: "monthly" as const,
        nextDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    },
  ]

  // Calculate monthly and annual totals
  const monthlyTotal = recurringTransactions
    .filter((tx) => tx.recurring.frequency === "monthly")
    .reduce((sum, tx) => sum + tx.amount, 0)

  const yearlyTotal =
    recurringTransactions.filter((tx) => tx.recurring.frequency === "yearly").reduce((sum, tx) => sum + tx.amount, 0) /
      12 +
    monthlyTotal

  // Group by category
  const expensesByCategory = recurringTransactions.reduce(
    (acc, tx) => {
      if (!acc[tx.category]) {
        acc[tx.category] = 0
      }

      if (tx.recurring.frequency === "monthly") {
        acc[tx.category] += tx.amount
      } else if (tx.recurring.frequency === "yearly") {
        acc[tx.category] += tx.amount / 12
      }

      return acc
    },
    {} as Record<string, number>,
  )

  // Sort categories by amount (highest first)
  const sortedCategories = Object.entries(expensesByCategory)
    .sort(([, amountA], [, amountB]) => amountB - amountA)
    .map(([category, amount]) => ({ category, amount }))

  // Find upcoming renewals (next 7 days)
  const upcomingRenewals = recurringTransactions
    .filter((tx) => {
      const daysUntilRenewal = Math.ceil((tx.recurring.nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysUntilRenewal <= 7 && daysUntilRenewal > 0
    })
    .sort((a, b) => a.recurring.nextDate.getTime() - b.recurring.nextDate.getTime())

  const handleAddSubscription = () => {
    // In a real app, this would open a form to add a new subscription
    alert("This would open a form to add a new subscription")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring Transactions</h1>
          <p className="text-muted-foreground mt-2">Detect and manage recurring expenses and subscriptions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/expenses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Expenses
            </Link>
          </Button>
          <Button onClick={handleAddSubscription}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Subscription Summary</CardTitle>
            <CardDescription>Overview of your recurring expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <RecurringExpenseSummary
              monthlyTotal={monthlyTotal}
              yearlyTotal={yearlyTotal}
              categorySummary={sortedCategories}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Renewals</CardTitle>
            <CardDescription>Subscriptions renewing in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingRenewals.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Upcoming Renewals</h3>
                <p className="text-muted-foreground mt-2">
                  You don't have any subscriptions renewing in the next 7 days.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingRenewals.map((tx) => {
                  const daysUntil = Math.ceil((tx.recurring.nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

                  return (
                    <div key={tx.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{tx.merchant}</p>
                        <p className="text-sm text-muted-foreground">{tx.category}</p>
                        <p className="text-xs text-muted-foreground">
                          Renews in {daysUntil} {daysUntil === 1 ? "day" : "days"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${tx.amount.toFixed(2)}</p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {tx.recurring.frequency}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions" className="flex items-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>All your recurring expenses and subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseList expenses={recurringTransactions} showRecurring={true} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Calendar</CardTitle>
              <CardDescription>View when your subscriptions renew throughout the month</CardDescription>
            </CardHeader>
            <CardContent>
              <SubscriptionCalendar subscriptions={recurringTransactions} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { 
  notifyWatchlistAlert,
  notifyBudgetAlert,
  notifyExpenseReminder,
  notifyBillReminder,
  notifyInvestmentUpdate
} from "@/lib/notifications"

export function NotificationDemo() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleCreateNotification = async (type: string) => {
    setLoading(type)
    try {
      let result;
      
      switch (type) {
        case "watchlist":
          result = await notifyWatchlistAlert({
            ticker: "AAPL",
            companyName: "Apple Inc.",
            currentPrice: 205.25,
            targetPrice: 200.00,
            isAboveTarget: true
          })
          break;
          
        case "budget":
          result = await notifyBudgetAlert({
            category: "Dining Out",
            budgetAmount: 300,
            spentAmount: 275,
            percentage: 92,
            isOverBudget: false
          })
          break;
          
        case "expense":
          result = await notifyExpenseReminder({
            expenseName: "Car Insurance",
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 125.50,
            isDue: false,
            daysUntilDue: 3
          })
          break;
          
        case "bill":
          result = await notifyBillReminder({
            billName: "Internet Subscription",
            dueDate: new Date().toISOString(),
            amount: 79.99,
            isDue: true
          })
          break;
          
        case "investment":
          result = await notifyInvestmentUpdate({
            investmentName: "S&P 500 ETF",
            type: "performance",
            amount: 250.75,
            percentageChange: 2.3,
            isPositive: true
          })
          break;
          
        default:
          break;
      }
      
      if (result?.success) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} notification created successfully`)
      } else {
        toast.error(`Failed to create ${type} notification: ${result?.error}`)
      }
    } catch (error) {
      console.error(`Error creating ${type} notification:`, error)
      toast.error(`Failed to create ${type} notification`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Demo</CardTitle>
        <CardDescription>
          Test the notification system by creating different types of notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={() => handleCreateNotification("watchlist")}
            disabled={loading === "watchlist"}
          >
            {loading === "watchlist" ? "Creating..." : "Create Watchlist Alert"}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleCreateNotification("budget")}
            disabled={loading === "budget"}
          >
            {loading === "budget" ? "Creating..." : "Create Budget Alert"}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleCreateNotification("expense")}
            disabled={loading === "expense"}
          >
            {loading === "expense" ? "Creating..." : "Create Expense Reminder"}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleCreateNotification("bill")}
            disabled={loading === "bill"}
          >
            {loading === "bill" ? "Creating..." : "Create Bill Reminder"}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleCreateNotification("investment")}
            disabled={loading === "investment"}
          >
            {loading === "investment" ? "Creating..." : "Create Investment Update"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

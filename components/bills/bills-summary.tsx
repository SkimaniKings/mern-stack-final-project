"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getBills } from "@/app/actions/bills"
import { formatCurrency } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

interface Bill {
  id: string
  name: string
  // Support both amount and amount_due fields
  amount?: number
  amount_due?: number
  // Support both next_payment_date and next_due_date fields
  next_payment_date?: string
  next_due_date?: string
  // Support both billing_frequency and frequency fields
  billing_frequency?: string
  frequency?: string
  // Support both auto_pay and is_automatic fields
  auto_pay?: boolean
  is_automatic?: boolean
  // Status field from the database
  status?: string
  // Other fields
  payment_schedule?: { status: string; scheduled_date: string }[]
  billers?: { name: string; category: string }
  is_paid?: boolean
  last_paid_date?: string
  bill_payments?: {
    id: string
    payment_date: string
    payment_status?: string
    amount_paid: number
    payment_method: string
    note?: string
  }[]
  category?: {
    id: string
    name: string
    description?: string
    icon?: string
  }
}

export function BillsSummary() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({
    totalDue: 0,
    dueSoon: 0,
    overdue: 0,
    upcoming: 0,
    overdueBillsCount: 0,
    dueSoonBillsCount: 0,
    upcomingBillsCount: 0,
    totalBillsCount: 0
  })

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const data = await getBills()
        setBills(data)
        calculateSummary(data)
      } catch (err) {
        setError("Error fetching bills")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchBills()
  }, [])

  const calculateSummary = (bills: Bill[]) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let totalDue = 0
    let dueSoon = 0
    let overdue = 0
    let upcoming = 0

    // Count for each category
    let overdueBillsCount = 0
    let dueSoonBillsCount = 0
    let upcomingBillsCount = 0

    console.log('Calculating bill summary for', bills.length, 'bills');
    
    bills.forEach((bill) => {
      // Skip bills that are explicitly marked as paid
      if (bill.status === 'paid' || bill.is_paid) {
        console.log(`Skipping paid bill: ${bill.name}`);
        return;
      }
      
      try {
        // Get the bill amount - handle different property names for amount
        const amount = typeof bill.amount_due !== 'undefined' ? bill.amount_due : bill.amount;
        if (typeof amount !== 'number' || isNaN(amount)) {
          console.error(`Invalid amount for bill ${bill.name}:`, amount);
          return; // Skip bills with invalid amounts
        }
        
        // Get the due date - handle undefined values safely
        const dueDateStr = bill.next_due_date || bill.next_payment_date;
        if (!dueDateStr) {
          console.error(`Missing due date for bill ${bill.name}`);
          return; // Skip bills with missing dates
        }
        
        const dueDate = new Date(dueDateStr);
        if (isNaN(dueDate.getTime())) {
          console.error(`Invalid date for bill ${bill.name}:`, dueDateStr);
          return; // Skip bills with invalid dates
        }
        
        // Calculate days until due
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        console.log(`Processing bill: ${bill.name}, status: ${bill.status}, amount: ${amount}, due in: ${diffDays} days`);
        
        // Add to total due regardless of when it's due (as long as it's not paid)
        totalDue += amount;
        
        // Categorize based on status and due date
        if (bill.status === 'overdue' || diffDays < 0) {
          // Overdue bills
          overdue += amount;
          overdueBillsCount++;
          console.log(`Added to overdue: ${bill.name}, amount: ${amount}`);
        } else if (diffDays <= 7) {
          // Due soon (within 7 days)
          dueSoon += amount;
          dueSoonBillsCount++;
          console.log(`Added to due soon: ${bill.name}, amount: ${amount}`);
        } else {
          // Upcoming (more than 7 days away)
          upcoming += amount;
          upcomingBillsCount++;
          console.log(`Added to upcoming: ${bill.name}, amount: ${amount}`);
        }
      } catch (e) {
        console.error(`Error processing bill ${bill.name}:`, e);
      }
    })

    setSummary({
      totalDue: Math.round(totalDue * 100) / 100,
      dueSoon: Math.round(dueSoon * 100) / 100,
      overdue: Math.round(overdue * 100) / 100,
      upcoming: Math.round(upcoming * 100) / 100,
      overdueBillsCount,
      dueSoonBillsCount,
      upcomingBillsCount,
      totalBillsCount: overdueBillsCount + dueSoonBillsCount + upcomingBillsCount
    })
  }

  if (loading) {
    return <Skeleton className="h-[200px] w-full" />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-destructive mr-2" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Count unpaid bills
  const unpaidCount = bills.filter(bill => {
    if (bill.is_paid) return false;
    if (bill.payment_schedule && 
        bill.payment_schedule.length > 0 && 
        bill.payment_schedule[0].status === "paid") {
      return false;
    }
    return true;
  }).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Total Due</CardTitle>
          <CardDescription>All unpaid bills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalDue)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.totalBillsCount} unpaid bills
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-destructive">Overdue</CardTitle>
          <CardDescription>Past due bills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.overdue)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.overdueBillsCount} {summary.overdueBillsCount === 1 ? 'bill' : 'bills'} require immediate attention
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-yellow-600">Due Soon</CardTitle>
          <CardDescription>Due within 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.dueSoon)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.dueSoonBillsCount} {summary.dueSoonBillsCount === 1 ? 'bill' : 'bills'} need attention soon
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-blue-600">Upcoming</CardTitle>
          <CardDescription>Future bills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.upcoming)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.upcomingBillsCount} {summary.upcomingBillsCount === 1 ? 'bill' : 'bills'} coming up
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

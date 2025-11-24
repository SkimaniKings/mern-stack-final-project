"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { AlertCircle, ChevronLeft, ChevronRight, CheckCircle2, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { getBills } from "@/app/actions/bills"

interface Bill {
  id: string
  name: string
  amount: number
  next_payment_date: string
  payment_schedule?: { status: string; scheduled_date: string }[]
  billers?: { name: string; category: string }
  is_paid?: boolean
  notes?: string
  status?: string
  scheduled_date?: string
  auto_pay?: boolean
  bill_payments?: {
    id: string
    payment_date: string
    payment_status: string
    amount_paid: number
    payment_method: string
  }[]
}

interface BillsCalendarProps {
  initialBills?: Bill[]
}

export function BillsCalendar({ initialBills = [] }: BillsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState<Array<{ date: Date; bills: Bill[] }>>([])  
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null)
  const [bills, setBills] = useState<Bill[]>(initialBills)
  const [loading, setLoading] = useState(initialBills.length === 0)
  const [error, setError] = useState<string | null>(null)

  // Fetch bills data directly
  useEffect(() => {
    const fetchBillsData = async () => {
      if (initialBills.length > 0) {
        // Use initial bills if provided
        return
      }
      
      try {
        setLoading(true)
        const data = await getBills()
        
        // Validate and sanitize the data
        const validatedBills = data.map((bill: any) => ({
          ...bill,
          amount: typeof bill.amount === 'number' ? bill.amount : parseFloat(bill.amount) || 0,
          next_payment_date: bill.next_payment_date || new Date().toISOString().split('T')[0]
        }))
        
        setBills(validatedBills)
      } catch (err) {
        console.error("Error fetching bills:", err)
        setError(typeof err === 'string' ? err : "Failed to load bills. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    
    fetchBillsData()
  }, [])

  useEffect(() => {
    generateCalendarDays(currentMonth)
  }, [bills, currentMonth])

  const generateCalendarDays = (month: Date) => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()

    // Get first day of month and last day of month
    const firstDay = new Date(year, monthIndex, 1)
    const lastDay = new Date(year, monthIndex + 1, 0)

    // Get day of week for first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay()

    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek
    const prevMonthLastDay = new Date(year, monthIndex, 0).getDate()

    const days = []

    // Add days from previous month
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(year, monthIndex - 1, prevMonthLastDay - i)
      days.push({
        date,
        bills: getBillsForDate(date),
      })
    }

    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, monthIndex, i)
      days.push({
        date,
        bills: getBillsForDate(date),
      })
    }

    // Add days from next month to complete grid (6 rows of 7 days = 42 total)
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, monthIndex + 1, i)
      days.push({
        date,
        bills: getBillsForDate(date),
      })
    }

    setCalendarDays(days)
  }

  const getBillsForDate = (date: Date) => {
    return bills.filter((bill) => {
      // Use next_due_date instead of next_payment_date to ensure bills appear on their actual due date
      if (!bill.next_due_date) return false;
      
      try {
        // Parse the bill's due date
        const billDate = new Date(bill.next_due_date);
        console.log(`Comparing calendar date ${date.toISOString().split('T')[0]} with bill due date ${bill.next_due_date}`);
        
        // Check if the dates match (day, month, year)
        const match = (
          billDate.getDate() === date.getDate() &&
          billDate.getMonth() === date.getMonth() &&
          billDate.getFullYear() === date.getFullYear()
        );
        
        if (match) {
          console.log(`Found match for bill ${bill.name} on date ${date.toISOString().split('T')[0]}`);
        }
        
        return match;
      } catch (e) {
        console.error(`Error comparing dates for bill ${bill.name}:`, e);
        return false;
      }
    })
  }

  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + increment)
    setCurrentMonth(newMonth)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth()
  }
  
  const getBillStatus = (bill: Bill) => {
    // First check if the bill has been explicitly marked as paid
    if (bill.is_paid) {
      return "paid";
    }
    
    // Check for bill payments
    if (bill.bill_payments && bill.bill_payments.length > 0) {
      // Sort payments by date, most recent first
      const sortedPayments = [...bill.bill_payments].sort((a, b) => 
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );
      
      // If the most recent payment has a completed status, the bill is paid
      if (sortedPayments[0].payment_status === "completed") {
        return "paid";
      }
    }
    
    // Then check payment_schedule if available
    if (bill.payment_schedule && bill.payment_schedule.length > 0) {
      const latestSchedule = bill.payment_schedule[0];
      if (latestSchedule.status === "paid") {
        return "paid";
      }
      if (latestSchedule.status === "overdue") {
        return "overdue";
      }
    }
    
    // If status not determined yet, check due date
    try {
      const dueDate = new Date(bill.next_payment_date);
      const today = new Date();
      
      // Set hours to 0 for proper comparison
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      if (isNaN(dueDate.getTime())) {
        return "unpaid"; // Default to unpaid if date is invalid
      }
      
      // If auto_pay is enabled and due date has passed, consider it paid
      if (bill.auto_pay && dueDate < today) {
        return "paid";
      }
      
      // Calculate the difference in days
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // If due date has passed, it's overdue
      if (diffDays < 0) {
        return "overdue";
      }
      
      // If due date is within 7 days, it's upcoming
      if (diffDays <= 7) {
        return "upcoming";
      }
      
      // More than 7 days away
      return "unpaid";
    } catch (e) {
      console.error("Error determining bill status:", e);
    }
    
    return "unpaid";
  };
  
  const getBillStatusStyles = (bill: Bill) => {
    const status = getBillStatus(bill);
    
    if (status === "paid") {
      return {
        bgColor: "bg-green-100",
        textColor: "text-green-800",
        borderColor: "border-green-200",
        icon: CheckCircle2,
        iconColor: "text-green-500"
      };
    } else if (status === "overdue") {
      return {
        bgColor: "bg-red-100",
        textColor: "text-red-800",
        borderColor: "border-red-200",
        icon: AlertCircle,
        iconColor: "text-red-500"
      };
    } else if (status === "upcoming") {
      return {
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-800",
        borderColor: "border-yellow-200",
        icon: Clock,
        iconColor: "text-yellow-500"
      };
    } else {
      return {
        bgColor: "bg-blue-100",
        textColor: "text-blue-800",
        borderColor: "border-blue-200",
        icon: Clock,
        iconColor: "text-blue-500"
      };
    }
  };

  if (loading) {
    return <Skeleton className="h-[600px] w-full" />
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

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bills Calendar</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="font-medium text-lg">
              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
            <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center font-medium mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 relative">
          {calendarDays.map((day, index) => {
            const isCurrentDay = isToday(day.date);
            const inCurrentMonth = isCurrentMonth(day.date);
            const isHovered = hoveredDayIndex === index;
            const hasBills = day.bills.length > 0;
            
            return (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] p-2 border rounded-md transition-all",
                  isCurrentDay
                    ? "bg-primary/10 border-primary shadow-sm"
                    : inCurrentMonth
                      ? "bg-card hover:border-primary/50"
                      : "bg-muted/30 text-muted-foreground",
                  hasBills && "hover:shadow-md"
                )}
                onMouseEnter={() => hasBills ? setHoveredDayIndex(index) : null}
                onMouseLeave={() => setHoveredDayIndex(null)}
              >
                <div className={cn(
                  "text-right text-sm font-medium p-1 mb-1",
                  isCurrentDay && "text-primary font-bold"
                )}>
                  {format(day.date, "d")}
                </div>
                <div className="space-y-1 max-h-[80px] overflow-y-auto">
                  {day.bills.slice(0, 2).map((bill) => {
                    const styles = getBillStatusStyles(bill);
                    const StatusIcon = styles.icon;
                    
                    return (
                      <div
                        key={bill.id}
                        className={cn(
                          "text-xs p-1.5 rounded border flex items-start justify-between",
                          styles.bgColor,
                          styles.textColor,
                          styles.borderColor
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{bill.name}</div>
                          <div className="font-bold">{formatCurrency(bill.amount)}</div>
                        </div>
                        <StatusIcon className={cn("h-4 w-4 ml-1 flex-shrink-0", styles.iconColor)} />
                      </div>
                    );
                  })}
                </div>
                {day.bills.length > 2 && (
                  <div className="text-xs text-center mt-1 text-muted-foreground cursor-pointer hover:text-primary">
                    +{day.bills.length - 2} more
                  </div>
                )}
                
                {/* Popup for bills on hover */}
                {isHovered && hasBills && (
                  <div className="absolute z-50 bg-white dark:bg-gray-950 border shadow-xl rounded-lg p-4 w-72 max-h-[400px] overflow-y-auto"
                    style={{
                      top: `calc(${Math.floor(index / 7) * 100}px + 120px)`,
                      left: `calc(${index % 7} * 14.28% - ${index % 7 > 3 ? '250px' : '0px'})`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-base">
                        Bills for {format(day.date, "MMMM d, yyyy")}
                      </h3>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setHoveredDayIndex(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {day.bills.map((bill) => {
                        const styles = getBillStatusStyles(bill);
                        const StatusIcon = styles.icon;
                        
                        return (
                          <div
                            key={bill.id}
                            className={cn(
                              "p-3 rounded-md border flex items-start justify-between",
                              styles.bgColor,
                              styles.textColor,
                              styles.borderColor
                            )}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">{bill.name}</div>
                              <div className="font-bold text-base mt-1">{formatCurrency(bill.amount)}</div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200">
                                  {format(new Date(bill.next_payment_date), "MMM d")}
                                </span>
                              </div>
                              {bill.notes && (
                                <div className="text-xs mt-2 opacity-80">{bill.notes}</div>
                              )}
                            </div>
                            <StatusIcon className={cn("h-5 w-5 ml-2 flex-shrink-0 mt-1", styles.iconColor)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  )
}

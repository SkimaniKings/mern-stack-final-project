import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { formatCurrency } from "@/lib/utils"

interface RecurringTransaction {
  id: string
  merchant: string
  category: string
  amount: number
  date: Date
  recurring: {
    frequency: "monthly" | "yearly"
    nextDate: Date
  }
}

interface SubscriptionCalendarProps {
  transactions: RecurringTransaction[]
}

export function SubscriptionCalendar({ transactions }: SubscriptionCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Function to get all renewal dates for the current month
  const getRenewalDates = () => {
    const today = new Date()
    const currentMonth = date ? date.getMonth() : today.getMonth()
    const currentYear = date ? date.getFullYear() : today.getFullYear()
    
    const renewalDates: { [key: string]: RecurringTransaction[] } = {}
    
    transactions.forEach(transaction => {
      // For monthly subscriptions
      if (transaction.recurring.frequency === "monthly") {
        const renewalDay = transaction.recurring.nextDate.getDate()
        
        // Create a date for this month with the renewal day
        const renewalDate = new Date(currentYear, currentMonth, renewalDay)
        
        // Format date as string for the map key
        const dateKey = renewalDate.toISOString().split('T')[0]
        
        if (!renewalDates[dateKey]) {
          renewalDates[dateKey] = []
        }
        
        renewalDates[dateKey].push(transaction)
      }
      
      // For yearly subscriptions, check if renewal is in current month
      if (transaction.recurring.frequency === "yearly" && 
          transaction.recurring.nextDate.getMonth() === currentMonth &&
          transaction.recurring.nextDate.getFullYear() === currentYear) {
        
        const dateKey = transaction.recurring.nextDate.toISOString().split('T')[0]
        
        if (!renewalDates[dateKey]) {
          renewalDates[dateKey] = []
        }
        
        renewalDates[dateKey].push(transaction)
      }
    })
    
    return renewalDates
  }
  
  const renewalDates = getRenewalDates()
  
  // Get transactions for the selected day
  const getSelectedDayTransactions = () => {
    if (!selectedDay) return []
    
    const dateKey = selectedDay.toISOString().split('T')[0]
    return renewalDates[dateKey] || []
  }
  
  const selectedDayTransactions = getSelectedDayTransactions()
  
  // Calculate total for selected day
  const selectedDayTotal = selectedDayTransactions.reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={date}
        onSelect={(newDate) => {
          setDate(newDate)
          setSelectedDay(newDate)
        }}
        className="rounded-md border"
        modifiers={{
          subscription: Object.keys(renewalDates).map(date => new Date(date)),
        }}
        modifiersStyles={{
          subscription: {
            fontWeight: "bold",
            backgroundColor: "hsl(var(--primary) / 0.1)",
            color: "hsl(var(--primary))",
            borderRadius: "0",
          }
        }}
        components={{
          DayContent: ({ date }) => {
            const dateKey = date.toISOString().split('T')[0]
            const dayTransactions = renewalDates[dateKey] || []
            
            return (
              <div className="relative h-full w-full p-2">
                <span>{date.getDate()}</span>
                {dayTransactions.length > 0 && (
                  <span className="absolute bottom-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </div>
            )
          }
        }}
      />
      
      {selectedDay && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">
                  {selectedDay.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                {selectedDayTransactions.length > 0 && (
                  <Badge variant="outline">
                    {formatCurrency(selectedDayTotal)}
                  </Badge>
                )}
              </div>
              
              {selectedDayTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscriptions renew on this day</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {selectedDayTransactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                      <div>
                        <p className="font-medium">{tx.merchant}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {tx.recurring.frequency}
                        </Badge>
                      </div>
                      <p className="font-medium">{formatCurrency(tx.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

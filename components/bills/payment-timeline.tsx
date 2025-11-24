"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Clock, CreditCard, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Payment {
  id: string
  subscriptionId: string
  subscriptionName: string
  amount: number
  dueDate: Date
  status: "upcoming" | "paid" | "overdue"
  paymentMethod: string
}

interface PaymentTimelineProps {
  payments: Payment[]
  onPaymentClick?: (payment: Payment) => void
}

export function PaymentTimeline({ payments, onPaymentClick }: PaymentTimelineProps) {
  const [activeTab, setActiveTab] = useState("upcoming")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Filter payments based on active tab
  const filteredPayments = payments.filter(payment => {
    if (activeTab === "upcoming") {
      return payment.status === "upcoming"
    } else if (activeTab === "paid") {
      return payment.status === "paid"
    } else if (activeTab === "overdue") {
      return payment.status === "overdue"
    }
    return true
  })
  
  // Group payments by month
  const paymentsByMonth = filteredPayments.reduce((acc, payment) => {
    const month = new Date(payment.dueDate).toLocaleString('default', { month: 'long', year: 'numeric' })
    if (!acc[month]) {
      acc[month] = []
    }
    acc[month].push(payment)
    return acc
  }, {} as Record<string, Payment[]>)
  
  // Calculate total amount for each month
  const monthlyTotals = Object.entries(paymentsByMonth).reduce((acc, [month, payments]) => {
    acc[month] = payments.reduce((sum, payment) => sum + payment.amount, 0)
    return acc
  }, {} as Record<string, number>)
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() - 1)
      return newDate
    })
  }
  
  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + 1)
      return newDate
    })
  }
  
  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }
  
  // Get status badge color
  const getStatusBadge = (status: Payment["status"]) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Upcoming</Badge>
      case "paid":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>
      case "overdue":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>
      default:
        return null
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Timeline</CardTitle>
        <CardDescription>
          Track your upcoming, paid, and overdue payments
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            {Object.entries(paymentsByMonth).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(paymentsByMonth).map(([month, monthPayments]) => (
                  <div key={month} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">{month}</h3>
                      <div className="flex items-center text-sm font-medium">
                        <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                        {formatCurrency(monthlyTotals[month])}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {monthPayments.map(payment => (
                        <div 
                          key={payment.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => onPaymentClick?.(payment)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <CreditCard className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{payment.subscriptionName}</p>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDate(payment.dueDate)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <span className="font-medium">{formatCurrency(payment.amount)}</span>
                            {getStatusBadge(payment.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-lg font-medium">No payments found</p>
                <p className="text-sm text-muted-foreground">
                  {activeTab === "upcoming" 
                    ? "You have no upcoming payments" 
                    : activeTab === "paid" 
                      ? "You have no paid payments" 
                      : "You have no overdue payments"}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 
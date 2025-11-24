"use client"

import { useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Payment {
  id: string
  name: string
  amount: number
  date: number // Day of month (1-31)
  type: "bill" | "subscription"
  category?: string
  paymentMethod?: string
}

interface PaymentTimelineChartProps {
  payments: Payment[]
}

export function PaymentTimelineChart({ payments }: PaymentTimelineChartProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  // Group payments by day
  const paymentsByDay = payments.reduce(
    (acc, payment) => {
      if (!acc[payment.date]) {
        acc[payment.date] = []
      }
      acc[payment.date].push(payment)
      return acc
    },
    {} as Record<number, Payment[]>,
  )

  // Calculate daily totals
  const dailyTotals = Object.entries(paymentsByDay).reduce(
    (acc, [day, dayPayments]) => {
      acc[Number.parseInt(day)] = dayPayments.reduce((sum, payment) => sum + payment.amount, 0)
      return acc
    },
    {} as Record<number, number>,
  )

  // Find the maximum daily total for scaling
  const maxDailyTotal = Math.max(...Object.values(dailyTotals), 1)

  // Calculate running balance throughout the month
  // Assume starting balance of 0 and income on day 1
  const runningBalance = {}
  let balance = 0

  for (let day = 1; day <= 31; day++) {
    if (dailyTotals[day]) {
      balance -= dailyTotals[day]
    }
    runningBalance[day] = balance
  }

  // Handle day selection
  const handleDayClick = (day: number) => {
    setSelectedDay(selectedDay === day ? null : day)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-4" ref={chartRef}>
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-medium">Payment Distribution</h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50">
              <span className="h-2 w-2 rounded-full bg-blue-500 mr-1"></span>
              Bills
            </Badge>
            <Badge variant="outline" className="bg-purple-50">
              <span className="h-2 w-2 rounded-full bg-purple-500 mr-1"></span>
              Subscriptions
            </Badge>
          </div>
        </div>

        <div className="relative h-60">
          {/* X-axis (days) */}
          <div className="absolute bottom-0 left-0 right-0 flex">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <TooltipProvider key={day}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex-1 h-8 flex items-end justify-center cursor-pointer border-t ${
                        selectedDay === day ? "bg-gray-100" : ""
                      } ${day % 5 === 0 ? "border-gray-300" : "border-gray-200"}`}
                      onClick={() => handleDayClick(day)}
                    >
                      {day % 5 === 0 && <span className="text-xs text-gray-500">{day}</span>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Day {day}</p>
                    {dailyTotals[day] && <p className="font-medium">${dailyTotals[day].toFixed(2)}</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>

          {/* Bars for payment amounts */}
          <div className="absolute bottom-8 left-0 right-0 flex h-40">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const dayPayments = paymentsByDay[day] || []
              const total = dailyTotals[day] || 0
              const height = total ? (total / maxDailyTotal) * 100 : 0

              // Split by type
              const billPayments = dayPayments.filter((p) => p.type === "bill")
              const subscriptionPayments = dayPayments.filter((p) => p.type === "subscription")

              const billTotal = billPayments.reduce((sum, p) => sum + p.amount, 0)
              const subscriptionTotal = subscriptionPayments.reduce((sum, p) => sum + p.amount, 0)

              const billHeight = billTotal ? (billTotal / maxDailyTotal) * 100 : 0
              const subscriptionHeight = subscriptionTotal ? (subscriptionTotal / maxDailyTotal) * 100 : 0

              return (
                <div
                  key={day}
                  className={`flex-1 flex flex-col-reverse ${selectedDay === day ? "opacity-100" : "opacity-80"}`}
                  style={{ height: "100%" }}
                >
                  {billHeight > 0 && (
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: `${billHeight}%` }}></div>
                  )}
                  {subscriptionHeight > 0 && (
                    <div className="w-full bg-purple-500 rounded-t" style={{ height: `${subscriptionHeight}%` }}></div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Running balance line */}
          <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 31 100" preserveAspectRatio="none">
              <path
                d={`M0,${50} ${Object.entries(runningBalance)
                  .map(([day, balance]) => {
                    // Normalize balance to fit in the chart (0-100)
                    const normalizedBalance = 50 - (balance / maxDailyTotal) * 50
                    return `L${Number.parseInt(day) - 1},${normalizedBalance}`
                  })
                  .join(" ")}`}
                fill="none"
                stroke="rgba(234, 88, 12, 0.5)"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </div>
      </div>

      {selectedDay && paymentsByDay[selectedDay] && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Payments on Day {selectedDay}</h3>
            <div className="space-y-3">
              {paymentsByDay[selectedDay].map((payment) => (
                <div key={payment.id} className="flex justify-between items-center p-2 border-b">
                  <div>
                    <div className="font-medium">{payment.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={
                          payment.type === "bill" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                        }
                      >
                        {payment.type}
                      </Badge>
                      {payment.category && <span>{payment.category}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${payment.amount.toFixed(2)}</div>
                    {payment.paymentMethod && (
                      <div className="text-xs text-muted-foreground">{payment.paymentMethod}</div>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 font-medium">
                <span>Total</span>
                <span>${dailyTotals[selectedDay].toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


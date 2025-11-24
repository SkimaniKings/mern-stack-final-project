"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DebtStrategySelector } from "@/components/debt/debt-strategy-selector"
import { DebtPayoffChart } from "@/components/debt/debt-payoff-chart"
import { formatCurrency } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Debt {
  id: string
  name: string
  balance: number
  interestRate: number
  minimumPayment: number
  actualPayment: number
}

export function DebtPayoffPlan() {
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche")
  const [extraPayment, setExtraPayment] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // In a real app, this would come from your database
  const debts: Debt[] = [
    {
      id: "1",
      name: "Credit Card A",
      balance: 5750,
      interestRate: 24.99,
      minimumPayment: 150,
      actualPayment: 300,
    },
    {
      id: "2",
      name: "Auto Loan",
      balance: 18500,
      interestRate: 4.5,
      minimumPayment: 450,
      actualPayment: 450,
    },
    {
      id: "3",
      name: "Student Loan",
      balance: 21500,
      interestRate: 5.8,
      minimumPayment: 250,
      actualPayment: 500,
    },
  ]

  const handleStrategyChange = (newStrategy: "avalanche" | "snowball") => {
    setStrategy(newStrategy)
  }

  const handleExtraPaymentChange = (amount: number) => {
    setExtraPayment(amount)
  }

  // Sort debts according to selected strategy
  const sortedDebts = [...debts].sort((a, b) => {
    if (strategy === "avalanche") {
      // Highest interest rate first
      return b.interestRate - a.interestRate
    } else {
      // Lowest balance first
      return a.balance - b.balance
    }
  })

  // Calculate payoff time and total interest
  const calculatePayoffResults = () => {
    let totalMonths = 0
    let totalInterest = 0
    const monthsToPayoff: Record<string, number> = {}

    // Deep copy of debts to avoid modifying original
    const remainingDebts = sortedDebts.map((debt) => ({ ...debt }))
    const totalMinPayment = remainingDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0)
    let availableExtra = extraPayment

    // Continue until all debts are paid off
    while (remainingDebts.length > 0) {
      totalMonths++

      // Apply payments to each debt
      for (let i = 0; i < remainingDebts.length; i++) {
        const debt = remainingDebts[i]

        // Calculate interest for this month
        const monthlyInterest = debt.balance * (debt.interestRate / 100 / 12)
        totalInterest += monthlyInterest

        // Determine payment amount
        let payment = debt.minimumPayment

        // Add extra payment to first debt in the list (highest priority according to strategy)
        if (i === 0 && availableExtra > 0) {
          payment += availableExtra
        }

        // Apply payment to balance
        debt.balance = debt.balance + monthlyInterest - payment

        // If debt is paid off
        if (debt.balance <= 0) {
          // Record months to payoff
          monthsToPayoff[debt.id] = totalMonths

          // Add any overpayment to available extra
          availableExtra = Math.abs(debt.balance)

          // Remove this debt from the list
          remainingDebts.splice(i, 1)
          i--

          // If no more debts, we're done
          if (remainingDebts.length === 0) {
            break
          }
        }
      }
    }

    return {
      totalMonths,
      totalInterest,
      monthsToPayoff,
    }
  }

  const payoffResults = calculatePayoffResults()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Debt Payoff Strategy</CardTitle>
          <CardDescription>Choose a strategy and see how quickly you can become debt-free</CardDescription>
        </CardHeader>
        <CardContent>
          <DebtStrategySelector
            strategy={strategy}
            onStrategyChange={handleStrategyChange}
            extraPayment={extraPayment}
            onExtraPaymentChange={handleExtraPaymentChange}
          />

          <div className="mt-6">
            <Tabs defaultValue="chart">
              <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                <TabsTrigger value="chart">Payoff Chart</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>
              <TabsContent value="chart" className="mt-4">
                <DebtPayoffChart debts={sortedDebts} strategy={strategy} extraPayment={extraPayment} />
              </TabsContent>
              <TabsContent value="summary" className="mt-4">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="bg-muted rounded-lg p-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Total Payoff Time</h3>
                      <p className="text-2xl font-bold mt-1">
                        {Math.floor(payoffResults.totalMonths / 12)} years, {payoffResults.totalMonths % 12} months
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Total Interest Paid</h3>
                      <p className="text-2xl font-bold mt-1">{formatCurrency(payoffResults.totalInterest)}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Monthly Payment</h3>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(debts.reduce((sum, debt) => sum + debt.minimumPayment, 0) + extraPayment)}
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-lg">
                    <div className="grid grid-cols-4 gap-4 p-4 border-b font-medium">
                      <div>Debt</div>
                      <div>Balance</div>
                      <div>Interest Rate</div>
                      <div>Payoff Date</div>
                    </div>
                    {sortedDebts.map((debt) => (
                      <div key={debt.id} className="grid grid-cols-4 gap-4 p-4 border-b last:border-0">
                        <div>{debt.name}</div>
                        <div>{formatCurrency(debt.balance)}</div>
                        <div>{debt.interestRate}%</div>
                        <div>
                          {payoffResults.monthsToPayoff[debt.id]
                            ? new Date(
                                new Date().getFullYear(),
                                new Date().getMonth() + payoffResults.monthsToPayoff[debt.id],
                                1,
                              ).toLocaleDateString(undefined, { year: "numeric", month: "short" })
                            : "Unknown"}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 text-sm">
                    <h3 className="font-medium">Strategy Impact</h3>
                    <p className="mt-1">
                      Using the{" "}
                      {strategy === "avalanche"
                        ? "avalanche (highest interest first)"
                        : "snowball (lowest balance first)"}{" "}
                      method
                      {extraPayment > 0 ? ` with an extra ${formatCurrency(extraPayment)} monthly payment` : ""}, you'll
                      be debt-free in {payoffResults.totalMonths} months and save on interest.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


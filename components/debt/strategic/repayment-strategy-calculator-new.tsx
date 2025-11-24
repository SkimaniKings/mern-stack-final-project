"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"
import { Info, Plus, Trash2, RefreshCw, Loader2 } from "lucide-react"
import {
  Tooltip as TooltipComponent,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDebtContext } from "@/lib/debt/debt-context"

// Interface for internal debt representation in the calculator
interface Debt {
  id: string
  name: string
  balance: number
  interestRate: number
  minimumPayment: number
  // Adding fields to track progress
  initialBalance?: number
  amountPaid?: number
  interestPaid?: number
  daysToPayoff?: number
}

interface PayoffResult {
  strategy: string
  totalInterest: number
  totalPayments: number
  monthsToPayoff: number
  debtFreeDate: Date
  payoffOrder: string[] // List of debt names in order of payoff
  monthlyPayments: {
    month: number
    payment: number
    remainingBalance: number
    interestPaid: number // Track interest paid each month
    principalPaid: number // Track principal paid each month
  }[]
  debtProgress: { // Track individual debt progress
    id: string
    name: string
    initialBalance: number
    amountPaid: number
    interestPaid: number
    daysToPayoff: number
  }[]
}

export function RepaymentStrategyCalculator() {
  const [strategy, setStrategy] = useState<"avalanche" | "snowball" | "hybrid">("avalanche")
  const [extraPayment, setExtraPayment] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<PayoffResult[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  
  // Use the debt context to get debts
  const { debts: contextDebts, loading: contextLoading } = useDebtContext()

  // Convert context debts to calculator format whenever they change
  useEffect(() => {
    console.log('RepaymentCalculator: Context debts changed, count:', contextDebts.length)
    
    // Always process the debts, even if empty
    const mappedDebts: Debt[] = contextDebts.map(debt => ({
      id: debt.id,
      name: debt.name,
      balance: debt.current_balance,
      interestRate: debt.interest_rate,
      minimumPayment: debt.minimum_payment || 0
    }))
    
    console.log('RepaymentCalculator: Mapped debts:', mappedDebts.length)
    setDebts(mappedDebts)
    
    // Only calculate if we have debts
    if (mappedDebts.length > 0) {
      // We need to use a setTimeout to ensure the state is updated before calculation
      setTimeout(() => {
        try {
          calculatePayoffResults(mappedDebts)
        } catch (error) {
          console.error('Error calculating payoff results:', error)
          setError('Failed to calculate payoff results')
        }
      }, 100) // Increased timeout to ensure state is fully updated
    } else {
      // Clear results if we have no debts
      setResults([])
    }
  }, [contextDebts]) // We're intentionally excluding calculatePayoffResults to avoid infinite loops

  const calculatePayoffResults = (debtList: Debt[] = debts) => {
    try {
      setLoading(true)
      setError(null)
      
      if (debtList.length === 0) {
        setResults([])
        return
      }
      
      // Calculate results for each strategy
      const avalancheResult = calculateStrategy("avalanche", debtList)
      const snowballResult = calculateStrategy("snowball", debtList)
      const hybridResult = calculateStrategy("hybrid", debtList)
      
      setResults([avalancheResult, snowballResult, hybridResult])
    } catch (error) {
      console.error("Error calculating payoff results:", error)
      setError("Failed to calculate payoff results")
    } finally {
      setLoading(false)
    }
  }

  const calculateStrategy = (strategyType: "avalanche" | "snowball" | "hybrid", debtList: Debt[] = debts): PayoffResult => {
    // Make a deep copy of debts to avoid modifying the original
    const workingDebts: Debt[] = debtList.map(debt => ({
      ...debt,
      initialBalance: debt.balance,
      amountPaid: 0,
      interestPaid: 0,
      daysToPayoff: 0
    }))
    
    // If no debts, return empty result
    if (workingDebts.length === 0) {
      return {
        strategy: strategyType,
        totalInterest: 0,
        totalPayments: 0,
        monthsToPayoff: 0,
        debtFreeDate: new Date(),
        payoffOrder: [],
        monthlyPayments: [],
        debtProgress: []
      }
    }
    
    // Calculate total minimum payments
    const totalMinPayment = workingDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0)
    
    // Apply specific strategy sorting logic
    const getStrategyPriority = () => {
      switch (strategyType) {
        case "avalanche":
          // Sort by highest interest rate first
          return [...workingDebts].sort((a, b) => b.interestRate - a.interestRate)
        
        case "snowball":
          // Sort by lowest balance first
          return [...workingDebts].sort((a, b) => a.balance - b.balance)
        
        case "hybrid":
          // Custom hybrid approach - combine interest rate and balance factors
          return [...workingDebts].sort((a, b) => {
            // Calculate a score based on both interest rate and balance
            // Higher interest rate and lower balance get higher priority
            const scoreA = (a.interestRate / 100) * (1 - (a.balance / (a.balance + b.balance)))
            const scoreB = (b.interestRate / 100) * (1 - (b.balance / (a.balance + b.balance)))
            return scoreB - scoreA
          })
        
        default:
          return [...workingDebts]
      }
    }
    
    const prioritizedDebts = getStrategyPriority()
    
    // Track monthly payment data
    const monthlyPayments: {
      month: number
      payment: number
      remainingBalance: number
      interestPaid: number
      principalPaid: number
    }[] = []
    
    // Track payoff order
    const payoffOrder: string[] = []
    
    // Set up tracking variables
    let month = 0
    let totalInterestPaid = 0
    let totalPrincipalPaid = 0
    let totalPayments = 0
    let remainingDebts = [...prioritizedDebts]
    
    // Continue until all debts are paid off
    while (remainingDebts.length > 0 && month < 600) { // Cap at 50 years to prevent infinite loops
      month++
      
      let monthlyInterestPaid = 0
      let monthlyPrincipalPaid = 0
      let monthlyPayment = 0
      
      // Calculate how much extra payment is available this month
      let availableExtraPayment = extraPayment
      
      // Process each debt in priority order
      for (let i = 0; i < remainingDebts.length; i++) {
        const debt = remainingDebts[i]
        
        // Calculate interest for this month
        const monthlyInterest = debt.balance * (debt.interestRate / 100 / 12)
        
        // Add interest to tracking
        debt.interestPaid = (debt.interestPaid || 0) + monthlyInterest
        monthlyInterestPaid += monthlyInterest
        totalInterestPaid += monthlyInterest
        
        // Calculate payment for this debt
        let payment = debt.minimumPayment
        
        // If this is the highest priority debt with remaining balance, add extra payment
        if (i === 0 && availableExtraPayment > 0) {
          payment += availableExtraPayment
          availableExtraPayment = 0
        }
        
        // Ensure payment doesn't exceed balance + interest
        const maxPayment = debt.balance + monthlyInterest
        payment = Math.min(payment, maxPayment)
        
        // Apply payment
        const principalPayment = payment - monthlyInterest
        debt.balance -= principalPayment
        debt.amountPaid = (debt.amountPaid || 0) + payment
        
        // Update tracking
        monthlyPrincipalPaid += principalPayment
        totalPrincipalPaid += principalPayment
        monthlyPayment += payment
        totalPayments += payment
        
        // Check if debt is paid off
        if (debt.balance <= 0.01) { // Allow for small floating point errors
          debt.balance = 0
          debt.daysToPayoff = month * 30 // Approximate days
          payoffOrder.push(debt.name)
          
          // If debt is paid off, make its minimum payment available as extra for next highest priority debt
          if (i < remainingDebts.length - 1) {
            availableExtraPayment += debt.minimumPayment
          }
        }
      }
      
      // Remove paid off debts
      remainingDebts = remainingDebts.filter(debt => debt.balance > 0)
      
      // Record monthly payment data
      monthlyPayments.push({
        month,
        payment: monthlyPayment,
        remainingBalance: remainingDebts.reduce((sum, debt) => sum + debt.balance, 0),
        interestPaid: monthlyInterestPaid,
        principalPaid: monthlyPrincipalPaid
      })
    }
    
    // Calculate debt-free date
    const debtFreeDate = new Date()
    debtFreeDate.setMonth(debtFreeDate.getMonth() + month)
    
    // Create debt progress array for reporting
    const debtProgress = prioritizedDebts.map(debt => ({
      id: debt.id,
      name: debt.name,
      initialBalance: debt.initialBalance || 0,
      amountPaid: debt.amountPaid || 0,
      interestPaid: debt.interestPaid || 0,
      daysToPayoff: debt.daysToPayoff || 0
    }))
    
    return {
      strategy: strategyType,
      totalInterest: totalInterestPaid,
      totalPayments: totalPayments,
      monthsToPayoff: month,
      debtFreeDate,
      payoffOrder,
      monthlyPayments,
      debtProgress
    }
  }

  const refreshDebts = () => {
    // Map context debts to calculator format
    const mappedDebts: Debt[] = contextDebts.map(debt => ({
      id: debt.id,
      name: debt.name,
      balance: debt.current_balance,
      interestRate: debt.interest_rate,
      minimumPayment: debt.minimum_payment || 0
    }))
    
    // Update local state with mapped debts
    setDebts(mappedDebts)
    
    // Calculate results with latest debts
    calculatePayoffResults(mappedDebts)
  }

  const getBestStrategy = () => {
    if (results.length === 0) return null
    
    // Find strategy with lowest total interest
    return results.reduce((best, current) => 
      current.totalInterest < best.totalInterest ? current : best
    )
  }

  // Format a date as MM/YYYY
  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getFullYear()}`
  }

  // Get the best strategy
  const bestStrategy = getBestStrategy()

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Repayment Strategy Calculator</CardTitle>
          <CardDescription>
            Compare different debt payoff strategies to find the most efficient approach.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-medium">Strategy Selection</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a debt repayment strategy that works best for you.
                </p>
                <RadioGroup 
                  value={strategy} 
                  onValueChange={(value) => setStrategy(value as "avalanche" | "snowball" | "hybrid")}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="avalanche" id="avalanche" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="avalanche" className="font-medium">Avalanche Method</Label>
                      <p className="text-sm text-muted-foreground">
                        Pay off highest interest rate debts first to minimize interest payments.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="snowball" id="snowball" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="snowball" className="font-medium">Snowball Method</Label>
                      <p className="text-sm text-muted-foreground">
                        Pay off smallest balances first for psychological wins and motivation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="hybrid" id="hybrid" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="hybrid" className="font-medium">Hybrid Approach</Label>
                      <p className="text-sm text-muted-foreground">
                        Balances interest rates and balances for an optimized approach.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">Extra Monthly Payment</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add extra payment to accelerate your debt payoff.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="extra-payment">Amount: {formatCurrency(extraPayment)}</Label>
                    <Input
                      id="extra-payment"
                      type="number"
                      min="0"
                      step="10"
                      value={extraPayment}
                      onChange={(e) => setExtraPayment(Number(e.target.value))}
                      className="w-24"
                    />
                  </div>
                  <Slider
                    value={[extraPayment]}
                    min={0}
                    max={1000}
                    step={10}
                    onValueChange={(value) => setExtraPayment(value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$0</span>
                    <span>$250</span>
                    <span>$500</span>
                    <span>$750</span>
                    <span>$1,000</span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button 
                    onClick={refreshDebts} 
                    disabled={loading || contextLoading || debts.length === 0}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Calculate Payoff Plan
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="rounded-md bg-destructive/15 p-4 text-destructive">
                <p>{error}</p>
              </div>
            )}
            
            {contextLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : debts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No debts found. Add debts to calculate repayment strategies.</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {results.map((result) => (
                    <Card key={result.strategy} className={`overflow-hidden ${result === bestStrategy ? 'border-primary' : ''}`}>
                      <CardHeader className="bg-muted/50 pb-2">
                        <CardTitle className="text-lg">
                          {result.strategy.charAt(0).toUpperCase() + result.strategy.slice(1)} Method
                          {result === bestStrategy && bestStrategy && (
                            <Badge className="ml-2" variant="outline">Best</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <dl className="space-y-2">
                          <div className="flex justify-between">
                            <dt className="text-sm font-medium text-muted-foreground">Total Interest:</dt>
                            <dd className="text-sm font-medium">{formatCurrency(result.totalInterest)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-sm font-medium text-muted-foreground">Months to Payoff:</dt>
                            <dd className="text-sm font-medium">{result.monthsToPayoff}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-sm font-medium text-muted-foreground">Debt-Free Date:</dt>
                            <dd className="text-sm font-medium">{formatDate(result.debtFreeDate)}</dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <Tabs defaultValue="details" className="w-full">
                  <TabsList>
                    <TabsTrigger value="details">Payment Details</TabsTrigger>
                    <TabsTrigger value="comparison">Strategy Comparison</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Payment Schedule</h3>
                      <div className="flex items-center">
                        <label className="text-sm mr-2">Strategy:</label>
                        <select 
                          className="rounded-md border border-input bg-background px-3 py-1 text-sm"
                          value={bestStrategy?.strategy || "avalanche"}
                          onChange={(e) => {
                            const selectedStrategy = results.find(r => r.strategy === e.target.value)
                            if (selectedStrategy) {
                              // This would update the UI to show the selected strategy details
                              // but we're not actually changing the calculation
                            }
                          }}
                        >
                          {results.map(result => (
                            <option key={result.strategy} value={result.strategy}>
                              {result.strategy.charAt(0).toUpperCase() + result.strategy.slice(1)} Strategy
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={bestStrategy?.monthlyPayments || []}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" label={{ value: "Months", position: "bottom" }} />
                          <YAxis label={{ value: "Amount", angle: -90, position: "insideLeft" }} />
                          <Tooltip
                            formatter={(value) => formatCurrency(value as number)}
                            labelFormatter={(label) => `Month ${label}`}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="remainingBalance"
                            name="Remaining Balance"
                            stroke="#3b82f6"
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-2 text-left text-sm font-medium">Month</th>
                            <th className="px-4 py-2 text-right text-sm font-medium">Payment</th>
                            <th className="px-4 py-2 text-right text-sm font-medium">Remaining Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bestStrategy?.monthlyPayments.slice(0, 12).map((row) => (
                            <tr key={row.month} className="border-b">
                              <td className="px-4 py-2 text-sm">{row.month}</td>
                              <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.payment)}</td>
                              <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.remainingBalance)}</td>
                            </tr>
                          ))}
                          {bestStrategy && bestStrategy.monthlyPayments.length > 24 && (
                            <tr className="bg-muted/50 font-medium">
                              <td className="px-4 py-2 text-sm">...</td>
                              <td className="px-4 py-2 text-right text-sm">...</td>
                              <td className="px-4 py-2 text-right text-sm">...</td>
                            </tr>
                          )}
                          {bestStrategy?.monthlyPayments.slice(-12).map((row) => (
                            <tr key={row.month} className="border-b">
                              <td className="px-4 py-2 text-sm">{row.month}</td>
                              <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.payment)}</td>
                              <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.remainingBalance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="comparison" className="space-y-4">
                    <h3 className="text-lg font-medium">Strategy Comparison</h3>
                    
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={results.map(result => ({
                            name: result.strategy.charAt(0).toUpperCase() + result.strategy.slice(1),
                            interest: result.totalInterest,
                            months: result.monthsToPayoff
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                          <Tooltip formatter={(value, name) => {
                            if (name === "interest") return formatCurrency(value as number)
                            return value
                          }} />
                          <Legend />
                          <Bar yAxisId="left" dataKey="interest" name="Total Interest" fill="#8884d8" />
                          <Bar yAxisId="right" dataKey="months" name="Months to Payoff" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-2 text-left text-sm font-medium">Strategy</th>
                            <th className="px-4 py-2 text-right text-sm font-medium">Total Interest</th>
                            <th className="px-4 py-2 text-right text-sm font-medium">Months to Payoff</th>
                            <th className="px-4 py-2 text-right text-sm font-medium">Debt-Free Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((result) => (
                            <tr key={result.strategy} className={`border-b ${result === bestStrategy ? 'bg-primary/10' : ''}`}>
                              <td className="px-4 py-2 text-sm font-medium">
                                {result.strategy.charAt(0).toUpperCase() + result.strategy.slice(1)}
                                {result === bestStrategy && bestStrategy && (
                                  <Badge variant="outline" className="ml-2">Best</Badge>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right text-sm">{formatCurrency(result.totalInterest)}</td>
                              <td className="px-4 py-2 text-right text-sm">{result.monthsToPayoff}</td>
                              <td className="px-4 py-2 text-right text-sm">{formatDate(result.debtFreeDate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

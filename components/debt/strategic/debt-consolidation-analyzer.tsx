"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Info, RefreshCw, Loader2 } from "lucide-react"
import {
  Tooltip as TooltipComponent,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getDebts, type Debt as ApiDebt } from "@/app/actions/debts"

interface Debt {
  id: string
  name: string
  balance: number
  interestRate: number
  minimumPayment: number
}

interface ConsolidationOption {
  id: string
  name: string
  interestRate: number
  term: number
  originationFee: number
  monthlyPayment: number
}

interface ConsolidationResult {
  currentDebts: Debt[]
  consolidationOption: ConsolidationOption
  totalInterest: number
  newTotalInterest: number
  interestSaved: number
  monthlyPaymentSavings: number
  breakEvenMonths: number
  timeline: {
    month: number
    currentBalance: number
    newBalance: number
    interestPaid: number
    newInterestPaid: number
  }[]
}

export function DebtConsolidationAnalyzer() {
  const [activeTab, setActiveTab] = useState<"overview" | "comparison" | "timeline">("overview")
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [results, setResults] = useState<ConsolidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchingDebts, setFetchingDebts] = useState(true)
  const [currentDebts, setCurrentDebts] = useState<Debt[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch debts from the database when component mounts
  useEffect(() => {
    fetchExistingDebts()
  }, [])

  const fetchExistingDebts = async () => {
    try {
      setFetchingDebts(true)
      setFetchError(null)
      
      // Use the DebtService to get authenticated user debts
      const { DebtService } = await import('@/lib/debt/debt-service')
      const debtService = new DebtService()
      
      // Get debts using server-side authentication only
      const fetchedDBDebts = await debtService.getDebts()
      
      if (fetchedDBDebts && fetchedDBDebts.length > 0) {
        console.log('DebtConsolidationAnalyzer: Found', fetchedDBDebts.length, 'debts')
        
        // Map the database debt format to the component's format
        const mappedDebts: Debt[] = fetchedDBDebts.map(debt => ({
          id: debt.id,
          name: debt.name,
          balance: debt.current_balance, // Use current_balance from DB format
          interestRate: debt.interest_rate,
          minimumPayment: debt.minimum_payment || 0
        }))
        
        setCurrentDebts(mappedDebts)
      } else {
        setFetchError("No debts found. Please add debts in the Debt Management section first.")
      }
    } catch (error) {
      console.error("Error fetching debts:", error)
      setFetchError("Failed to load your debts. Please try again.")
    } finally {
      setFetchingDebts(false)
    }
  }

  const consolidationOptions: ConsolidationOption[] = [
    {
      id: "1",
      name: "Personal Loan",
      interestRate: 9.5,
      term: 60,
      originationFee: 500,
      monthlyPayment: 630,
    },
    {
      id: "2",
      name: "Home Equity Loan",
      interestRate: 6.25,
      term: 84,
      originationFee: 1000,
      monthlyPayment: 520,
    },
    {
      id: "3",
      name: "Balance Transfer Card",
      interestRate: 0,
      term: 18,
      originationFee: 150,
      monthlyPayment: 835,
    },
  ]

  useEffect(() => {
    if (selectedOption && currentDebts.length > 0) {
      calculateResults()
    }
  }, [selectedOption, currentDebts])

  const calculateResults = () => {
    setLoading(true)
    
    // Simulate API call delay
    setTimeout(() => {
      const option = consolidationOptions.find((opt) => opt.id === selectedOption)
      if (!option) {
        setLoading(false)
        return
      }
      
      const totalCurrentBalance = currentDebts.reduce((sum, debt) => sum + debt.balance, 0)
      const totalCurrentMonthlyPayment = currentDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0)
      
      // Calculate current total interest
      let currentBalance = totalCurrentBalance
      let totalInterest = 0
      let month = 0
      const maxMonths = 120 // 10 years max
      
      while (currentBalance > 0 && month < maxMonths) {
        month++
        
        // Calculate weighted average interest rate
        const weightedInterestRate = currentDebts.reduce((sum, debt) => {
          const debtRatio = debt.balance / totalCurrentBalance
          return sum + (debt.interestRate * debtRatio)
        }, 0)
        
        const monthlyInterest = currentBalance * (weightedInterestRate / 100 / 12)
        totalInterest += monthlyInterest
        
        currentBalance = currentBalance + monthlyInterest - totalCurrentMonthlyPayment
        if (currentBalance < 0) currentBalance = 0
      }
      
      // Calculate new loan details
      const newBalance = totalCurrentBalance + option.originationFee
      const monthlyRate = option.interestRate / 100 / 12
      const numberOfPayments = option.term
      
      // Calculate monthly payment using loan amortization formula
      const calculatedMonthlyPayment = 
        (newBalance * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
      
      // Calculate new total interest
      let newBalance2 = newBalance
      let newTotalInterest = 0
      let month2 = 0
      
      while (newBalance2 > 0 && month2 < maxMonths) {
        month2++
        
        const monthlyInterest = newBalance2 * monthlyRate
        newTotalInterest += monthlyInterest
        
        newBalance2 = newBalance2 + monthlyInterest - calculatedMonthlyPayment
        if (newBalance2 < 0) newBalance2 = 0
      }
      
      // Calculate break-even point
      const monthlySavings = totalCurrentMonthlyPayment - calculatedMonthlyPayment
      const breakEvenMonths = Math.ceil(option.originationFee / monthlySavings)
      
      // Generate timeline data
      const timeline = []
      let currentBalance3 = totalCurrentBalance
      let newBalance3 = newBalance
      let totalInterest3 = 0
      let newTotalInterest3 = 0
      
      for (let i = 0; i <= Math.min(month, month2); i++) {
        // Calculate weighted average interest rate for current debts
        const weightedInterestRate = currentDebts.reduce((sum, debt) => {
          const debtRatio = debt.balance / totalCurrentBalance
          return sum + (debt.interestRate * debtRatio)
        }, 0)
        
        const currentMonthlyInterest = currentBalance3 * (weightedInterestRate / 100 / 12)
        totalInterest3 += currentMonthlyInterest
        currentBalance3 = currentBalance3 + currentMonthlyInterest - totalCurrentMonthlyPayment
        if (currentBalance3 < 0) currentBalance3 = 0
        
        const newMonthlyInterest = newBalance3 * monthlyRate
        newTotalInterest3 += newMonthlyInterest
        newBalance3 = newBalance3 + newMonthlyInterest - calculatedMonthlyPayment
        if (newBalance3 < 0) newBalance3 = 0
        
        timeline.push({
          month: i,
          currentBalance: currentBalance3,
          newBalance: newBalance3,
          interestPaid: totalInterest3,
          newInterestPaid: newTotalInterest3,
        })
      }
      
      setResults({
        currentDebts,
        consolidationOption: option,
        totalInterest,
        newTotalInterest: newTotalInterest,
        interestSaved: totalInterest - newTotalInterest,
        monthlyPaymentSavings: totalCurrentMonthlyPayment - calculatedMonthlyPayment,
        breakEvenMonths,
        timeline,
      })
      
      setLoading(false)
    }, 1000)
  }

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Debt Consolidation Analyzer</CardTitle>
              <CardDescription>
                Compare debt consolidation options to see if you can save money on your existing debts.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchExistingDebts} 
              disabled={fetchingDebts}
            >
              {fetchingDebts ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Debts
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fetchingDebts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : fetchError ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center">
              <p className="text-destructive mb-4">{fetchError}</p>
              <p className="text-sm text-muted-foreground">
                Please add debts in the <a href="/debt-management" className="underline font-medium">Debt Management</a> section first.
              </p>
            </div>
          ) : currentDebts.length === 0 ? (
            <div className="rounded-md border border-muted p-6 text-center">
              <p className="text-muted-foreground mb-4">No debts found.</p>
              <p className="text-sm text-muted-foreground">
                Please add debts in the <a href="/debt-management" className="underline font-medium">Debt Management</a> section first.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Your Current Debts</h3>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left text-sm font-medium">Debt</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Balance</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Interest Rate</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Monthly Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentDebts.map((debt) => (
                        <tr key={debt.id} className="border-b">
                          <td className="px-4 py-2 text-sm">{debt.name}</td>
                          <td className="px-4 py-2 text-right text-sm">{formatCurrency(debt.balance)}</td>
                          <td className="px-4 py-2 text-right text-sm">{formatPercentage(debt.interestRate)}</td>
                          <td className="px-4 py-2 text-right text-sm">{formatCurrency(debt.minimumPayment)}</td>
                        </tr>
                      ))}
                      {currentDebts.length > 0 && (
                        <tr className="bg-muted/50 font-medium">
                          <td className="px-4 py-2 text-sm">Total</td>
                          <td className="px-4 py-2 text-right text-sm">
                            {formatCurrency(currentDebts.reduce((sum, debt) => sum + debt.balance, 0))}
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {formatPercentage(
                              currentDebts.reduce((sum, debt) => {
                                const debtRatio = debt.balance / currentDebts.reduce((sum, d) => sum + d.balance, 0)
                                return sum + (debt.interestRate * debtRatio)
                              }, 0)
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-sm">
                            {formatCurrency(currentDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0))}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Available Consolidation Options</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {consolidationOptions.map((option) => (
                    <Card
                      key={option.id}
                      className={`cursor-pointer transition-colors ${
                        selectedOption === option.id ? "border-2 border-primary" : ""
                      }`}
                      onClick={() => handleOptionSelect(option.id)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{option.name}</CardTitle>
                        <CardDescription>
                          Interest Rate: {formatPercentage(option.interestRate)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Term:</span>
                            <span className="font-medium">{option.term} months</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Monthly Payment:</span>
                            <span className="font-medium">{formatCurrency(option.monthlyPayment)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Origination Fee:</span>
                            <span className="font-medium">{formatCurrency(option.originationFee)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
          </div>
          )}
        </CardContent>
      </Card>

      {results && selectedOption && (
        <Card>
          <CardHeader>
            <CardTitle>Consolidation Analysis</CardTitle>
            <CardDescription>
              See how consolidating your debts could affect your total interest paid and monthly payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "overview" | "comparison" | "timeline")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Current Situation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Balance:</span>
                          <span className="font-medium">
                            {formatCurrency(results.currentDebts.reduce((sum, debt) => sum + debt.balance, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Monthly Payments:</span>
                          <span className="font-medium">
                            {formatCurrency(results.currentDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Interest:</span>
                          <span className="font-medium">{formatCurrency(results.totalInterest)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">After Consolidation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">New Loan Amount:</span>
                          <span className="font-medium">
                            {formatCurrency(
                              results.currentDebts.reduce((sum, debt) => sum + debt.balance, 0) +
                                results.consolidationOption.originationFee
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Monthly Payment:</span>
                          <span className="font-medium">{formatCurrency(results.consolidationOption.monthlyPayment)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Interest:</span>
                          <span className="font-medium">{formatCurrency(results.newTotalInterest)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6">
                  <h3 className="mb-4 text-lg font-medium">Potential Savings</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Interest Savings</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Total interest you could save over the life of the loan
                            </p>
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(results.interestSaved)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Monthly Payment Savings</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Reduction in your monthly payment amount
                            </p>
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(results.monthlyPaymentSavings)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="mt-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Break-Even Period</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Number of months until you recover the origination fee
                            </p>
                          </div>
                          <div className="text-2xl font-bold">
                            {results.breakEvenMonths} months
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="comparison" className="mt-4">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Interest Comparison",
                          "Current Interest": results.totalInterest,
                          "New Interest": results.newTotalInterest,
                        },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: "Total Interest", angle: -90, position: "insideLeft" }} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="Current Interest" fill="#3b82f6" />
                      <Bar dataKey="New Interest" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6">
                  <h3 className="mb-4 text-lg font-medium">Monthly Payment Comparison</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: "Monthly Payments",
                            "Current Payments": results.currentDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0),
                            "New Payment": results.consolidationOption.monthlyPayment,
                          },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: "Monthly Payment", angle: -90, position: "insideLeft" }} />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        <Bar dataKey="Current Payments" fill="#3b82f6" />
                        <Bar dataKey="New Payment" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="timeline" className="mt-4">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={results.timeline}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" label={{ value: "Months", position: "bottom" }} />
                      <YAxis label={{ value: "Balance", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                        labelFormatter={(label) => `Month ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="currentBalance"
                        name="Current Balance"
                        stroke="#3b82f6"
                        strokeDasharray="5 5"
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="newBalance"
                        name="New Balance"
                        stroke="#10b981"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6">
                  <h3 className="mb-4 text-lg font-medium">Interest Paid Over Time</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={results.timeline}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" label={{ value: "Months", position: "bottom" }} />
                        <YAxis label={{ value: "Interest Paid", angle: -90, position: "insideLeft" }} />
                        <Tooltip
                          formatter={(value) => formatCurrency(value as number)}
                          labelFormatter={(label) => `Month ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="interestPaid"
                          name="Current Interest"
                          stroke="#3b82f6"
                          strokeDasharray="5 5"
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="newInterestPaid"
                          name="New Interest"
                          stroke="#10b981"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 
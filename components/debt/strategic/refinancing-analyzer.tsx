"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate, formatPercentage } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Info } from "lucide-react"
import {
  Tooltip as TooltipComponent,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface RefinancingOption {
  id: string
  name: string
  currentRate: number
  newRate: number
  currentTerm: number
  newTerm: number
  balance: number
  closingCosts: number
  monthlyPayment: number
  newMonthlyPayment: number
}

interface RefinancingResult {
  option: RefinancingOption
  totalInterest: number
  newTotalInterest: number
  interestSaved: number
  breakEvenMonths: number
  monthlyBreakdown: {
    month: number
    currentBalance: number
    newBalance: number
    interestPaid: number
    newInterestPaid: number
  }[]
}

export function RefinancingAnalyzer() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [results, setResults] = useState<RefinancingResult[]>([])
  const [activeTab, setActiveTab] = useState<"comparison" | "timeline" | "breakdown">("comparison")

  // In a real app, this would come from your database or API
  const refinancingOptions: RefinancingOption[] = [
    {
      id: "1",
      name: "Mortgage Refinance",
      currentRate: 6.5,
      newRate: 5.25,
      currentTerm: 360,
      newTerm: 360,
      balance: 350000,
      closingCosts: 5000,
      monthlyPayment: 2212,
      newMonthlyPayment: 1932,
    },
    {
      id: "2",
      name: "Auto Loan Refinance",
      currentRate: 7.8,
      newRate: 5.9,
      currentTerm: 60,
      newTerm: 60,
      balance: 25000,
      closingCosts: 500,
      monthlyPayment: 504,
      newMonthlyPayment: 482,
    },
    {
      id: "3",
      name: "Student Loan Refinance",
      currentRate: 8.2,
      newRate: 5.5,
      currentTerm: 120,
      newTerm: 120,
      balance: 45000,
      closingCosts: 0,
      monthlyPayment: 550,
      newMonthlyPayment: 489,
    },
  ]

  useEffect(() => {
    if (selectedOption) {
      calculateResults()
    }
  }, [selectedOption])

  const calculateResults = () => {
    const results = refinancingOptions.map((option) => {
      const monthlyBreakdown = []
      let currentBalance = option.balance
      let newBalance = option.balance
      let totalInterest = 0
      let newTotalInterest = 0
      let month = 0

      // Calculate monthly interest rates
      const currentMonthlyRate = option.currentRate / 100 / 12
      const newMonthlyRate = option.newRate / 100 / 12

      // Calculate break-even point
      const monthlySavings = option.monthlyPayment - option.newMonthlyPayment
      const breakEvenMonths = Math.ceil(option.closingCosts / monthlySavings)

      while (month < Math.max(option.currentTerm, option.newTerm)) {
        month++

        // Calculate interest for current loan
        const currentInterest = currentBalance * currentMonthlyRate
        totalInterest += currentInterest
        currentBalance = currentBalance + currentInterest - option.monthlyPayment
        if (currentBalance < 0) currentBalance = 0

        // Calculate interest for new loan
        const newInterest = newBalance * newMonthlyRate
        newTotalInterest += newInterest
        newBalance = newBalance + newInterest - option.newMonthlyPayment
        if (newBalance < 0) newBalance = 0

        monthlyBreakdown.push({
          month,
          currentBalance,
          newBalance,
          interestPaid: totalInterest,
          newInterestPaid: newTotalInterest,
        })
      }

      return {
        option,
        totalInterest,
        newTotalInterest,
        interestSaved: totalInterest - newTotalInterest,
        breakEvenMonths,
        monthlyBreakdown,
      }
    })

    setResults(results)
  }

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId)
  }

  const getOptionColor = (index: number) => {
    const colors = ["#3b82f6", "#10b981", "#8b5cf6"]
    return colors[index % colors.length]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Refinancing Analyzer</CardTitle>
          <CardDescription>
            Compare refinancing options to see if you can save money on your existing loans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Available Refinancing Options</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {refinancingOptions.map((option, index) => (
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
                        Current Rate: {formatPercentage(option.currentRate)} → New Rate:{" "}
                        {formatPercentage(option.newRate)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Balance:</span>
                          <span className="font-medium">{formatCurrency(option.balance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Monthly Payment:</span>
                          <span className="font-medium">{formatCurrency(option.newMonthlyPayment)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Closing Costs:</span>
                          <span className="font-medium">{formatCurrency(option.closingCosts)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && selectedOption && (
        <Card>
          <CardHeader>
            <CardTitle>Refinancing Analysis</CardTitle>
            <CardDescription>
              See how refinancing affects your total interest paid and monthly payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "comparison" | "timeline" | "breakdown")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              </TabsList>

              <TabsContent value="comparison" className="mt-4">
                <div className="grid gap-6 md:grid-cols-2">
                  {results.map((result, index) => (
                    <Card key={result.option.id} className="border-2" style={{ borderColor: getOptionColor(index) }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{result.option.name}</CardTitle>
                        <CardDescription>
                          Rate reduction from {formatPercentage(result.option.currentRate)} to{" "}
                          {formatPercentage(result.option.newRate)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Interest (Current):</span>
                            <span className="font-medium">{formatCurrency(result.totalInterest)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Interest (New):</span>
                            <span className="font-medium">{formatCurrency(result.newTotalInterest)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Interest Saved:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(result.interestSaved)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Monthly Payment Savings:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(result.option.monthlyPayment - result.option.newMonthlyPayment)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Break-Even Period:</span>
                            <span className="font-medium">{result.breakEvenMonths} months</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={results[0].monthlyBreakdown}
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
                      {results.map((result, index) => (
                        <>
                          <Line
                            key={`${result.option.id}-current`}
                            type="monotone"
                            dataKey="currentBalance"
                            name={`${result.option.name} (Current)`}
                            stroke={getOptionColor(index)}
                            strokeDasharray="5 5"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            key={`${result.option.id}-new`}
                            type="monotone"
                            dataKey="newBalance"
                            name={`${result.option.name} (New)`}
                            stroke={getOptionColor(index)}
                            activeDot={{ r: 8 }}
                          />
                        </>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="breakdown" className="mt-4">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Interest Comparison",
                          ...results.reduce((acc, result, index) => {
                            acc[`${result.option.name} Current`] = result.totalInterest
                            acc[`${result.option.name} New`] = result.newTotalInterest
                            return acc
                          }, {} as Record<string, number>),
                        },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: "Total Interest", angle: -90, position: "insideLeft" }} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      {results.map((result, index) => (
                        <>
                          <Bar
                            key={`${result.option.id}-current`}
                            dataKey={`${result.option.name} Current`}
                            name={`${result.option.name} (Current)`}
                            fill={getOptionColor(index)}
                            stackId={result.option.id}
                          />
                          <Bar
                            key={`${result.option.id}-new`}
                            dataKey={`${result.option.name} New`}
                            name={`${result.option.name} (New)`}
                            fill={`${getOptionColor(index)}80`}
                            stackId={result.option.id}
                          />
                        </>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 
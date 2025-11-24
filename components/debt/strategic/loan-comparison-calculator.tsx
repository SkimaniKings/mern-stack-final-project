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
import { Info, Plus, Trash2, AlertCircle } from "lucide-react"
import {
  Tooltip as TooltipComponent,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Loan {
  id: string
  name: string
  amount: number
  interestRate: number
  term: number
  monthlyPayment: number
  totalInterest: number
  totalCost: number
  amortizationSchedule: {
    month: number
    payment: number
    principal: number
    interest: number
    remainingBalance: number
  }[]
}

export function LoanComparisonCalculator() {
  const [activeTab, setActiveTab] = useState<"overview" | "comparison" | "amortization">("overview")
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null)
  
  // Form state for adding new loans
  const [newLoan, setNewLoan] = useState({
    name: "",
    amount: 10000,
    interestRate: 5,
    term: 36
  })

  const calculateLoan = (loanData: Omit<Loan, "id" | "monthlyPayment" | "totalInterest" | "totalCost" | "amortizationSchedule">) => {
    const { amount, interestRate, term } = loanData
    const monthlyRate = interestRate / 100 / 12
    const numberOfPayments = term
    
    // Calculate monthly payment using loan amortization formula
    const monthlyPayment = 
      (amount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
    
    // Calculate total interest and generate amortization schedule
    let remainingBalance = amount
    let totalInterest = 0
    const amortizationSchedule = []
    
    for (let month = 1; month <= numberOfPayments; month++) {
      const interestPayment = remainingBalance * monthlyRate
      const principalPayment = monthlyPayment - interestPayment
      remainingBalance = remainingBalance - principalPayment
      totalInterest += interestPayment
      
      amortizationSchedule.push({
        month,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        remainingBalance: remainingBalance > 0 ? remainingBalance : 0,
      })
    }
    
    return {
      ...loanData,
      monthlyPayment,
      totalInterest,
      totalCost: amount + totalInterest,
      amortizationSchedule,
    }
  }

  const addLoan = () => {
    if (!newLoan.name.trim()) {
      alert("Please enter a name for the loan")
      return
    }
    
    setLoading(true)
    
    // Simulate API call delay
    setTimeout(() => {
      const calculatedLoan = calculateLoan({
        name: newLoan.name,
        amount: newLoan.amount,
        interestRate: newLoan.interestRate,
        term: newLoan.term
      })
      
      const newLoanWithId = {
        ...calculatedLoan,
        id: `loan-${Date.now()}`
      }
      
      setLoans(prevLoans => [...prevLoans, newLoanWithId])
      setSelectedLoanId(newLoanWithId.id)
      setLoading(false)
      
      // Reset form
      setNewLoan({
        name: "",
        amount: 10000,
        interestRate: 5,
        term: 36
      })
    }, 500)
  }

  const removeLoan = (id: string) => {
    setLoans(prevLoans => prevLoans.filter(loan => loan.id !== id))
    
    // If we're removing the selected loan, update the selection
    if (selectedLoanId === id) {
      setSelectedLoanId(loans.length > 1 ? loans.find(loan => loan.id !== id)?.id || null : null)
    }
  }

  const getBestLoan = () => {
    if (loans.length === 0) return null
    
    // Find the loan with the lowest total cost
    return loans.reduce((best, current) => 
      current.totalCost < best.totalCost ? current : best
    )
  }

  const bestLoan = getBestLoan()
  const selectedLoan = loans.find(loan => loan.id === selectedLoanId) || loans[0]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Loan Comparison Calculator</CardTitle>
          <CardDescription>
            Add and compare different loan options to find the best one for your needs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="loan-name">Loan Name</Label>
                <Input
                  id="loan-name"
                  placeholder="e.g., Car Loan, Mortgage"
                  value={newLoan.name}
                  onChange={(e) => setNewLoan(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loan-amount">Loan Amount</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="loan-amount"
                    min={1000}
                    max={100000}
                    step={1000}
                    value={[newLoan.amount]}
                    onValueChange={(value) => setNewLoan(prev => ({ ...prev, amount: value[0] }))}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={newLoan.amount}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-24"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loan-term">Loan Term (Months)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="loan-term"
                    min={12}
                    max={120}
                    step={12}
                    value={[newLoan.term]}
                    onValueChange={(value) => setNewLoan(prev => ({ ...prev, term: value[0] }))}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={newLoan.term}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, term: Number(e.target.value) }))}
                    className="w-24"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="interest-rate"
                    min={1}
                    max={20}
                    step={0.25}
                    value={[newLoan.interestRate]}
                    onValueChange={(value) => setNewLoan(prev => ({ ...prev, interestRate: value[0] }))}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={newLoan.interestRate}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, interestRate: Number(e.target.value) }))}
                    className="w-20"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={addLoan} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add Loan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="text-sm text-muted-foreground">Calculating loan options...</p>
            </div>
          </CardContent>
        </Card>
      ) : loans.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Loan Comparison Results</CardTitle>
            <CardDescription>
              See how different loan options compare in terms of monthly payments, total interest, and overall cost.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "overview" | "comparison" | "amortization")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                <TabsTrigger value="amortization">Amortization</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                <div className="grid gap-6 md:grid-cols-3">
                  {loans.map((loan) => (
                    <Card key={loan.id} className={bestLoan?.id === loan.id ? "border-2 border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{loan.name}</CardTitle>
                            <CardDescription>
                              Interest Rate: {formatPercentage(loan.interestRate)}
                            </CardDescription>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeLoan(loan.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Loan Amount:</span>
                            <span className="font-medium">{formatCurrency(loan.amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Term:</span>
                            <span className="font-medium">{loan.term} months</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Monthly Payment:</span>
                            <span className="font-medium">{formatCurrency(loan.monthlyPayment)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Interest:</span>
                            <span className="font-medium">{formatCurrency(loan.totalInterest)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Cost:</span>
                            <span className="font-medium">{formatCurrency(loan.totalCost)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {bestLoan && (
                  <div className="mt-6">
                    <Card className="bg-primary/5">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Best Option</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {bestLoan.name} with {formatPercentage(bestLoan.interestRate)} interest rate
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(bestLoan.totalCost)}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Cost</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="comparison" className="mt-4">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Total Cost Comparison",
                          ...loans.reduce((acc, loan) => ({
                            ...acc,
                            [loan.name]: loan.totalCost,
                          }), {}),
                        },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: "Total Cost", angle: -90, position: "insideLeft" }} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      {loans.map((loan, index) => (
                        <Bar 
                          key={loan.id} 
                          dataKey={loan.name} 
                          fill={index === 0 ? "#3b82f6" : index === 1 ? "#10b981" : "#f59e0b"} 
                        />
                      ))}
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
                            ...loans.reduce((acc, loan) => ({
                              ...acc,
                              [loan.name]: loan.monthlyPayment,
                            }), {}),
                          },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: "Monthly Payment", angle: -90, position: "insideLeft" }} />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        {loans.map((loan, index) => (
                          <Bar 
                            key={loan.id} 
                            dataKey={loan.name} 
                            fill={index === 0 ? "#3b82f6" : index === 1 ? "#10b981" : "#f59e0b"} 
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="mb-4 text-lg font-medium">Interest Comparison</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: "Total Interest",
                            ...loans.reduce((acc, loan) => ({
                              ...acc,
                              [loan.name]: loan.totalInterest,
                            }), {}),
                          },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: "Total Interest", angle: -90, position: "insideLeft" }} />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        {loans.map((loan, index) => (
                          <Bar 
                            key={loan.id} 
                            dataKey={loan.name} 
                            fill={index === 0 ? "#3b82f6" : index === 1 ? "#10b981" : "#f59e0b"} 
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="amortization" className="mt-4">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Amortization Schedule</h3>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="loan-select">Select Loan:</Label>
                      <select
                        id="loan-select"
                        className="rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={selectedLoanId || ""}
                        onChange={(e) => setSelectedLoanId(e.target.value)}
                      >
                        {loans.map(loan => (
                          <option key={loan.id} value={loan.id}>
                            {loan.name} ({formatPercentage(loan.interestRate)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={selectedLoan?.amortizationSchedule || []}
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
                          dataKey="principal"
                          name="Principal"
                          stroke="#3b82f6"
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="interest"
                          name="Interest"
                          stroke="#ef4444"
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="remainingBalance"
                          name="Remaining Balance"
                          stroke="#10b981"
                          strokeDasharray="5 5"
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
                          <th className="px-4 py-2 text-right text-sm font-medium">Principal</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Interest</th>
                          <th className="px-4 py-2 text-right text-sm font-medium">Remaining Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLoan?.amortizationSchedule.slice(0, 12).map((row) => (
                          <tr key={row.month} className="border-b">
                            <td className="px-4 py-2 text-sm">{row.month}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.payment)}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.principal)}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.interest)}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.remainingBalance)}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/50 font-medium">
                          <td className="px-4 py-2 text-sm">...</td>
                          <td className="px-4 py-2 text-right text-sm">...</td>
                          <td className="px-4 py-2 text-right text-sm">...</td>
                          <td className="px-4 py-2 text-right text-sm">...</td>
                          <td className="px-4 py-2 text-right text-sm">...</td>
                        </tr>
                        {selectedLoan?.amortizationSchedule.slice(-12).map((row) => (
                          <tr key={row.month} className="border-b">
                            <td className="px-4 py-2 text-sm">{row.month}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.payment)}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.principal)}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.interest)}</td>
                            <td className="px-4 py-2 text-right text-sm">{formatCurrency(row.remainingBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Add loan options to see comparison results.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 
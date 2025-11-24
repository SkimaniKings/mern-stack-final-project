"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Info } from "lucide-react"
import {
  Tooltip as TooltipComponent,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DebtToIncomeData {
  monthlyIncome: number
  monthlyDebtPayments: number
  dtiRatio: number
  recommendedDtiRatio: number
  categories: {
    name: string
    value: number
    color: string
  }[]
  timeline: {
    month: number
    dtiRatio: number
    income: number
    debtPayments: number
  }[]
}

export function DebtToIncomeTracker() {
  const [activeTab, setActiveTab] = useState<"overview" | "breakdown" | "timeline">("overview")
  const [income, setIncome] = useState<number>(5000)
  const [debtPayments, setDebtPayments] = useState<number>(1500)
  const [results, setResults] = useState<DebtToIncomeData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    calculateResults()
  }, [income, debtPayments])

  const calculateResults = () => {
    setLoading(true)
    
    // Simulate API call delay
    setTimeout(() => {
      const dtiRatio = (debtPayments / income) * 100
      const recommendedDtiRatio = 36 // Standard recommendation
      
      // Create categories for pie chart
      const categories = [
        {
          name: "Debt Payments",
          value: debtPayments,
          color: "#ef4444",
        },
        {
          name: "Disposable Income",
          value: income - debtPayments,
          color: "#10b981",
        },
      ]
      
      // Generate timeline data
      const timeline = []
      const monthsToProject = 12
      const monthlyIncomeIncrease = income * 0.02 // 2% annual raise
      const monthlyDebtReduction = debtPayments * 0.05 // 5% monthly debt reduction
      
      for (let month = 0; month <= monthsToProject; month++) {
        const projectedIncome = income + (monthlyIncomeIncrease * month)
        const projectedDebtPayments = Math.max(0, debtPayments - (monthlyDebtReduction * month))
        const projectedDtiRatio = (projectedDebtPayments / projectedIncome) * 100
        
        timeline.push({
          month,
          dtiRatio: projectedDtiRatio,
          income: projectedIncome,
          debtPayments: projectedDebtPayments,
        })
      }
      
      setResults({
        monthlyIncome: income,
        monthlyDebtPayments: debtPayments,
        dtiRatio,
        recommendedDtiRatio,
        categories,
        timeline,
      })
      
      setLoading(false)
    }, 1000)
  }

  const getDtiStatus = (dtiRatio: number) => {
    if (dtiRatio <= 28) return { text: "Excellent", color: "text-green-600" }
    if (dtiRatio <= 36) return { text: "Good", color: "text-blue-600" }
    if (dtiRatio <= 43) return { text: "Fair", color: "text-yellow-600" }
    return { text: "Poor", color: "text-red-600" }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Debt-to-Income Ratio Tracker</CardTitle>
          <CardDescription>
            Monitor your debt-to-income ratio and see how it changes over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label htmlFor="income">Monthly Income</Label>
                <div className="mt-2 flex items-center gap-4">
                  <Slider
                    id="income"
                    min={1000}
                    max={20000}
                    step={100}
                    value={[income]}
                    onValueChange={(value) => setIncome(value[0])}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="debt-payments">Monthly Debt Payments</Label>
                <div className="mt-2 flex items-center gap-4">
                  <Slider
                    id="debt-payments"
                    min={0}
                    max={10000}
                    step={100}
                    value={[debtPayments]}
                    onValueChange={(value) => setDebtPayments(value[0])}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={debtPayments}
                    onChange={(e) => setDebtPayments(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              {loading ? (
                <div className="text-center">
                  <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Calculating...</p>
                </div>
              ) : results ? (
                <div className="text-center">
                  <div className="text-5xl font-bold">{formatPercentage(results.dtiRatio / 100)}</div>
                  <div className={`mt-2 text-lg font-medium ${getDtiStatus(results.dtiRatio).color}`}>
                    {getDtiStatus(results.dtiRatio).text}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Recommended: {formatPercentage(results.recommendedDtiRatio / 100)}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Adjust the sliders to calculate your DTI ratio.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Debt-to-Income Analysis</CardTitle>
            <CardDescription>
              See a breakdown of your income and debt payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "overview" | "breakdown" | "timeline")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Current DTI Ratio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-4">
                        <div className={`text-5xl font-bold ${getDtiStatus(results.dtiRatio).color}`}>
                          {formatPercentage(results.dtiRatio / 100)}
                        </div>
                        <div className="mt-2 text-lg font-medium">{getDtiStatus(results.dtiRatio).text}</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Monthly Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Monthly Income:</span>
                          <span className="font-medium">{formatCurrency(results.monthlyIncome)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Debt Payments:</span>
                          <span className="font-medium text-red-600">{formatCurrency(results.monthlyDebtPayments)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Disposable Income:</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(results.monthlyIncome - results.monthlyDebtPayments)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6">
                  <h3 className="mb-4 text-lg font-medium">DTI Ratio Guidelines</h3>
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="rounded-full bg-green-100 p-2 text-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                              <path d="M20 6 9 17l-5-5"></path>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium">Front-End Ratio (≤28%)</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              This is the percentage of your monthly gross income that goes toward housing expenses (mortgage, property taxes, insurance, etc.).
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                              <path d="M20 6 9 17l-5-5"></path>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium">Back-End Ratio (≤36%)</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              This is the percentage of your monthly gross income that goes toward all debt obligations (housing, car loans, credit cards, student loans, etc.).
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="rounded-full bg-yellow-100 p-2 text-yellow-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                              <path d="M20 6 9 17l-5-5"></path>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium">Maximum Allowable Ratio (≤43%)</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              This is the maximum DTI ratio that most lenders will accept for a qualified mortgage.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="breakdown" className="mt-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={results.categories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {results.categories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Income vs. Debt</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Monthly Income:</span>
                            <span className="font-medium">{formatCurrency(results.monthlyIncome)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Debt Payments:</span>
                            <span className="font-medium text-red-600">{formatCurrency(results.monthlyDebtPayments)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Disposable Income:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(results.monthlyIncome - results.monthlyDebtPayments)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">DTI Ratio:</span>
                            <span className={`font-medium ${getDtiStatus(results.dtiRatio).color}`}>
                              {formatPercentage(results.dtiRatio / 100)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {results.dtiRatio > results.recommendedDtiRatio ? (
                            <>
                              <p className="text-sm text-muted-foreground">
                                Your DTI ratio is above the recommended level. Consider these strategies:
                              </p>
                              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                                <li>Increase your income through a side job or career advancement</li>
                                <li>Reduce your debt payments by refinancing or consolidating loans</li>
                                <li>Create a strict budget to allocate more money toward debt repayment</li>
                              </ul>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Your DTI ratio is within the recommended range. Keep up the good work!
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
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
                      <YAxis label={{ value: "DTI Ratio (%)", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "dtiRatio") return [formatPercentage((value as number) / 100), "DTI Ratio"]
                          return [formatCurrency(value as number), name]
                        }}
                        labelFormatter={(label) => `Month ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="dtiRatio"
                        name="DTI Ratio"
                        stroke="#3b82f6"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6">
                  <h3 className="mb-4 text-lg font-medium">Projected DTI Ratio</h3>
                  <p className="text-sm text-muted-foreground">
                    This timeline shows how your DTI ratio could change over time if you continue to make regular debt payments while your income grows. The projection assumes a 2% annual income increase and a 5% monthly reduction in debt payments.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 
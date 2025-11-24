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
import { Info } from "lucide-react"
import {
  Tooltip as TooltipComponent,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CreditFactor {
  name: string
  weight: number
  currentValue: number
  potentialValue: number
  description: string
}

interface CreditScoreResult {
  currentScore: number
  potentialScore: number
  scoreChange: number
  factors: CreditFactor[]
  timeline: {
    month: number
    score: number
  }[]
}

export function CreditScoreSimulator() {
  const [activeTab, setActiveTab] = useState<"overview" | "factors" | "timeline">("overview")
  const [results, setResults] = useState<CreditScoreResult | null>(null)
  const [loading, setLoading] = useState(false)

  // In a real app, this would come from your database or API
  const initialFactors: CreditFactor[] = [
    {
      name: "Payment History",
      weight: 35,
      currentValue: 85,
      potentialValue: 100,
      description: "Your history of making payments on time.",
    },
    {
      name: "Credit Utilization",
      weight: 30,
      currentValue: 65,
      potentialValue: 90,
      description: "The amount of credit you're using compared to your total available credit.",
    },
    {
      name: "Credit Age",
      weight: 15,
      currentValue: 70,
      potentialValue: 70,
      description: "The length of your credit history.",
    },
    {
      name: "Credit Mix",
      weight: 10,
      currentValue: 60,
      potentialValue: 80,
      description: "The variety of credit types you have (credit cards, loans, etc.).",
    },
    {
      name: "New Credit",
      weight: 10,
      currentValue: 75,
      potentialValue: 90,
      description: "Recent credit inquiries and new accounts.",
    },
  ]

  useEffect(() => {
    calculateResults()
  }, [])

  const calculateResults = () => {
    setLoading(true)
    
    // Simulate API call delay
    setTimeout(() => {
      const factors = [...initialFactors]
      
      // Calculate current score
      const currentScore = Math.round(
        factors.reduce((score, factor) => score + (factor.currentValue * factor.weight) / 100, 0)
      )
      
      // Calculate potential score
      const potentialScore = Math.round(
        factors.reduce((score, factor) => score + (factor.potentialValue * factor.weight) / 100, 0)
      )
      
      // Generate timeline data
      const timeline = []
      const scoreDiff = potentialScore - currentScore
      const monthsToImprove = 12
      
      for (let month = 0; month <= monthsToImprove; month++) {
        const progress = month / monthsToImprove
        const score = Math.round(currentScore + scoreDiff * progress)
        timeline.push({ month, score })
      }
      
      setResults({
        currentScore,
        potentialScore,
        scoreChange: potentialScore - currentScore,
        factors,
        timeline,
      })
      
      setLoading(false)
    }, 1000)
  }

  const getScoreColor = (score: number) => {
    if (score >= 800) return "text-green-600"
    if (score >= 700) return "text-blue-600"
    if (score >= 650) return "text-yellow-600"
    if (score >= 600) return "text-orange-600"
    return "text-red-600"
  }

  const getScoreCategory = (score: number) => {
    if (score >= 800) return "Excellent"
    if (score >= 700) return "Good"
    if (score >= 650) return "Fair"
    if (score >= 600) return "Poor"
    return "Very Poor"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Credit Score Simulator</CardTitle>
          <CardDescription>
            See how different actions could impact your credit score over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="text-center">
                <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                <p className="text-sm text-muted-foreground">Calculating your credit score...</p>
              </div>
            </div>
          ) : results ? (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "overview" | "factors" | "timeline")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="factors">Factors</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Current Credit Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-4">
                        <div className={`text-5xl font-bold ${getScoreColor(results.currentScore)}`}>
                          {results.currentScore}
                        </div>
                        <div className="mt-2 text-lg font-medium">{getScoreCategory(results.currentScore)}</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Potential Credit Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-4">
                        <div className={`text-5xl font-bold ${getScoreColor(results.potentialScore)}`}>
                          {results.potentialScore}
                        </div>
                        <div className="mt-2 text-lg font-medium">{getScoreCategory(results.potentialScore)}</div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Potential increase: <span className="font-medium text-green-600">+{results.scoreChange} points</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6">
                  <h3 className="mb-4 text-lg font-medium">Recommended Actions</h3>
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
                            <h4 className="font-medium">Pay all bills on time</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Payment history is the most important factor in your credit score. Set up automatic payments to ensure you never miss a due date.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="rounded-full bg-green-100 p-2 text-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                              <path d="M20 6 9 17l-5-5"></path>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium">Reduce credit utilization</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Aim to keep your credit utilization below 30%. Consider paying down balances or requesting credit limit increases.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="rounded-full bg-green-100 p-2 text-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                              <path d="M20 6 9 17l-5-5"></path>
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium">Diversify your credit mix</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Having a mix of credit types (credit cards, installment loans, etc.) can positively impact your score.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="factors" className="mt-4">
                <div className="space-y-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={results.factors}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: "Score", angle: -90, position: "insideLeft" }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="currentValue" name="Current" fill="#3b82f6" />
                        <Bar dataKey="potentialValue" name="Potential" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-4">
                    {results.factors.map((factor) => (
                      <Card key={factor.name}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{factor.name}</CardTitle>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Weight: {factor.weight}%</span>
                              <TooltipProvider>
                                <TooltipComponent>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <Info className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{factor.description}</p>
                                  </TooltipContent>
                                </TooltipComponent>
                              </TooltipProvider>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Current Score:</span>
                              <span className="font-medium">{factor.currentValue}/100</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Potential Score:</span>
                              <span className="font-medium text-green-600">{factor.potentialValue}/100</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Potential Improvement:</span>
                              <span className="font-medium text-green-600">+{factor.potentialValue - factor.currentValue} points</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
                      <YAxis label={{ value: "Credit Score", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        formatter={(value) => [value, "Score"]}
                        labelFormatter={(label) => `Month ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Credit Score"
                        stroke="#3b82f6"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6">
                  <h3 className="mb-4 text-lg font-medium">Timeline to Improvement</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on your current credit factors, it would take approximately 12 months of consistent positive credit behavior to reach your potential credit score. Remember that credit score improvements happen gradually over time as you build a positive credit history.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex h-[400px] items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No credit score data available.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 
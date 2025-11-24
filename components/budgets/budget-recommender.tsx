"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, Info, CheckCircle, DollarSign, PiggyBank, BarChart, TrendingUp } from "lucide-react"
import { generateBudgetRecommendation } from "@/app/actions/budget-recommendations"
import { formatCurrency } from "@/lib/utils"
import { supabaseClient } from "@/lib/supabase"
import { toast } from "sonner"
import { BudgetPieChart } from "@/components/budgeting/budget-pie-chart"

interface BudgetRecommendation {
  model_type: "traditional" | "zero-based" | "50-30-20" | "envelope"
  total_budget: number
  categories: {
    id: string
    name: string
    recommended_amount: number
    confidence_score: number
    reasoning: string
  }[]
  savings_target: number
  risk_level: "low" | "medium" | "high"
  adjustments: string[]
}

const BUDGET_MODELS = [
  {
    id: "traditional",
    name: "Traditional",
    description: "Based on historical spending patterns with suggested optimizations"
  },
  {
    id: "zero-based",
    name: "Zero-Based",
    description: "Every dollar is assigned a purpose, starting from zero"
  },
  {
    id: "50-30-20",
    name: "50/30/20 Rule",
    description: "50% needs, 30% wants, 20% savings"
  },
  {
    id: "envelope",
    name: "Envelope System",
    description: "Separate envelopes for different spending categories"
  }
] as const

export function BudgetRecommenderClient({ userId }: { userId: string }) {
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0)
  const [selectedModel, setSelectedModel] = useState<typeof BUDGET_MODELS[number]["id"]>("traditional")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingData, setIsFetchingData] = useState(true)
  const [recommendation, setRecommendation] = useState<Awaited<ReturnType<typeof generateBudgetRecommendation>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userFinancialData, setUserFinancialData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("generator")
  const [savedRecommendations, setSavedRecommendations] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Fetch user financial data and saved recommendations when component mounts
  useEffect(() => {
    async function fetchUserData() {
      try {
        setIsFetchingData(true)
        setError(null)
        
        // Get the current user
        const { data: { user } } = await supabaseClient.auth.getUser()
        
        if (!user) {
          setError("You must be logged in to use the budget recommender")
          return
        }
        
        // Fetch user's financial profile
        const { data: financialProfile, error: profileError } = await supabaseClient
          .from('user_financial_profile')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is 'not found'
          console.error("Error fetching financial profile:", profileError)
          setError("Failed to load your financial data")
          return
        }
        
        // Fetch user's transaction history for spending analysis
        const { data: transactions, error: transactionsError } = await supabaseClient
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(100) // Get recent transactions for analysis
        
        if (transactionsError) {
          console.error("Error fetching transactions:", transactionsError)
        }
        
        // Fetch previously saved budget recommendations
        const { data: savedRecs, error: savedRecsError } = await supabaseClient
          .from('budget_recommendations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (savedRecsError) {
          console.error("Error fetching saved recommendations:", savedRecsError)
        }
        
        // Set the monthly income from the user's profile if available
        if (financialProfile?.monthly_income) {
          setMonthlyIncome(financialProfile.monthly_income)
        }
        
        // Set user financial data for analysis
        setUserFinancialData({
          profile: financialProfile || null,
          transactions: transactions || []
        })
        
        // Set saved recommendations
        setSavedRecommendations(savedRecs || [])
        
      } catch (err) {
        console.error("Error in fetchUserData:", err)
        setError("An unexpected error occurred")
      } finally {
        setIsFetchingData(false)
      }
    }
    
    fetchUserData()
  }, [userId])
  
  const handleGenerateRecommendation = async () => {
    if (!monthlyIncome) {
      toast.error("Please enter your monthly income")
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      // First, analyze user's spending patterns if transaction data is available
      let spendingInsights = null
      if (userFinancialData?.transactions?.length > 0) {
        // Group transactions by category and calculate average spending
        const categorySpending = userFinancialData.transactions.reduce((acc: any, transaction: any) => {
          const category = transaction.category || 'Uncategorized'
          if (!acc[category]) {
            acc[category] = { total: 0, count: 0 }
          }
          acc[category].total += transaction.amount
          acc[category].count += 1
          return acc
        }, {})
        
        // Calculate average spending by category
        spendingInsights = Object.entries(categorySpending).map(([category, data]: [string, any]) => ({
          category,
          average_spending: data.total / data.count,
          total_spending: data.total,
          transaction_count: data.count
        }))
      }
      
      // Generate the budget recommendation using the server action
      const result = await generateBudgetRecommendation(
        userId,
        monthlyIncome,
        selectedModel,
        spendingInsights // Pass spending insights for more accurate recommendations
      )
      
      setRecommendation(result)
      
      // Show success message
      toast.success("Budget recommendation generated successfully")
    } catch (error) {
      console.error("Error generating budget recommendation:", error)
      setError("Failed to generate budget recommendation. Please try again.")
      toast.error("Failed to generate budget recommendation")
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSaveRecommendation = async () => {
    if (!recommendation) return
    
    try {
      setIsSaving(true)
      
      // Save the recommendation to Supabase
      const { data, error } = await supabaseClient
        .from('budget_recommendations')
        .insert({
          user_id: userId,
          model_type: recommendation.model_type,
          total_budget: recommendation.total_budget,
          categories: recommendation.categories,
          savings_target: recommendation.savings_target,
          risk_level: recommendation.risk_level,
          adjustments: recommendation.adjustments,
          monthly_income: monthlyIncome,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error("Error saving recommendation:", error)
        toast.error("Failed to save budget recommendation")
        return
      }
      
      // Add the new recommendation to the list of saved recommendations
      setSavedRecommendations([data, ...savedRecommendations])
      
      toast.success("Budget recommendation saved successfully")
    } catch (err) {
      console.error("Error in handleSaveRecommendation:", err)
      toast.error("An unexpected error occurred")
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleApplyRecommendation = async () => {
    if (!recommendation) return
    
    try {
      setIsLoading(true)
      
      // Create a new budget based on the recommendation
      const { data, error } = await supabaseClient
        .from('budgets')
        .insert({
          user_id: userId,
          name: `${selectedModel.toUpperCase()} Budget`,
          description: `Budget created from ${selectedModel} model recommendation`,
          monthly_income: monthlyIncome,
          categories: recommendation.categories.map(cat => ({
            name: cat.name,
            amount: cat.recommended_amount,
            percentage: (cat.recommended_amount / monthlyIncome) * 100
          })),
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error("Error creating budget:", error)
        toast.error("Failed to create budget from recommendation")
        return
      }
      
      toast.success("Budget created successfully!")
      
      // Redirect to the new budget
      window.location.href = `/budgets/${data.id}`
    } catch (err) {
      console.error("Error applying recommendation:", err)
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetchingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading your financial data...</span>
      </div>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-4">
          <TabsTrigger value="generator" className="flex items-center">
            <BarChart className="h-4 w-4 mr-2" />
            Generate Budget
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Saved Recommendations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="generator" className="mt-0">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">AI Budget Generator</h3>
            
            <div className="grid gap-4 mb-6">
              <div className="grid gap-2">
                <Label htmlFor="monthly-income">Monthly Income</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="monthly-income"
                    type="number"
                    placeholder="0.00"
                    value={monthlyIncome || ""}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    className="pl-10"
                  />
                </div>
                {userFinancialData?.profile?.monthly_income && userFinancialData.profile.monthly_income !== monthlyIncome && (
                  <p className="text-xs text-muted-foreground">
                    Your profile has {formatCurrency(userFinancialData.profile.monthly_income)} as monthly income.
                    <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setMonthlyIncome(userFinancialData.profile.monthly_income)}>
                      Use this value
                    </Button>
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="budget-model">Budget Model</Label>
                <Select
                  value={selectedModel}
                  onValueChange={(value: typeof selectedModel) => setSelectedModel(value)}
                >
                  <SelectTrigger id="budget-model">
                    <SelectValue placeholder="Select a budget model" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">{model.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {userFinancialData?.transactions?.length > 0 && (
                <Alert className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Spending Analysis Available</AlertTitle>
                  <AlertDescription>
                    Your recommendation will be based on {userFinancialData.transactions.length} recent transactions
                    for more accurate results.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleGenerateRecommendation}
                disabled={!monthlyIncome || isLoading}
                className="mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BarChart className="h-4 w-4 mr-2" />
                    Generate Recommendation
                  </>
                )}
              </Button>
            </div>

            {recommendation && (
              <div className="space-y-6 mt-6">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Total Budget</h4>
                    <p className="text-2xl font-bold">{formatCurrency(recommendation.total_budget)}</p>
                  </Card>
                  
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Savings Target</h4>
                    <p className="text-2xl font-bold">{formatCurrency(recommendation.savings_target)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((recommendation.savings_target / monthlyIncome) * 100)}% of income
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Model Type</h4>
                    <p className="text-2xl font-bold capitalize">{recommendation.model_type}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {BUDGET_MODELS.find(m => m.id === recommendation.model_type)?.description}
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Risk Level</h4>
                    <p className={`text-2xl font-bold capitalize
                      ${recommendation.risk_level === "low" ? "text-green-500" :
                        recommendation.risk_level === "medium" ? "text-yellow-500" :
                        "text-red-500"
                      }`}
                    >
                      {recommendation.risk_level}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {recommendation.risk_level === "low" ? "Conservative budget" :
                       recommendation.risk_level === "medium" ? "Balanced approach" :
                       "Aggressive savings plan"}
                    </p>
                  </Card>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Budget Allocation</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      <BudgetPieChart 
                        categories={recommendation.categories.map(cat => ({
                          name: cat.name,
                          amount: cat.recommended_amount,
                          percentage: (cat.recommended_amount / recommendation.total_budget) * 100
                        }))} 
                      />
                    </CardContent>
                  </Card>
                  
                  {recommendation.adjustments.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Alert variant={recommendation.risk_level === "high" ? "destructive" : "default"} className="mb-4">
                          <AlertTitle>Budget Insights</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc pl-4 space-y-1">
                              {recommendation.adjustments.map((adjustment, i) => (
                                <li key={i}>{adjustment}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                        
                        <div className="flex gap-2 mt-4">
                          <Button onClick={handleSaveRecommendation} disabled={isSaving} variant="outline">
                            {isSaving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Save Recommendation
                              </>
                            )}
                          </Button>
                          
                          <Button onClick={handleApplyRecommendation} disabled={isLoading}>
                            {isLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <PiggyBank className="h-4 w-4 mr-2" />
                                Create Budget
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Recommended Amount</TableHead>
                        <TableHead>% of Income</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Reasoning</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recommendation.categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{formatCurrency(category.recommended_amount)}</TableCell>
                          <TableCell>{((category.recommended_amount / monthlyIncome) * 100).toFixed(1)}%</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${category.confidence_score * 100}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {Math.round(category.confidence_score * 100)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {category.reasoning}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="saved" className="mt-0">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Saved Budget Recommendations</h3>
            
            {savedRecommendations.length === 0 ? (
              <div className="text-center py-8">
                <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium">No saved recommendations</h4>
                <p className="text-muted-foreground mb-4">
                  Generate a budget recommendation and save it to see it here.
                </p>
                <Button onClick={() => setActiveTab("generator")}>
                  <BarChart className="h-4 w-4 mr-2" />
                  Generate Recommendation
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {savedRecommendations.map((rec, index) => (
                  <Card key={rec.id} className="overflow-hidden">
                    <div className="p-4 border-b bg-muted/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium capitalize">{rec.model_type} Budget Model</h4>
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(rec.created_at).toLocaleDateString()} • 
                            Income: {formatCurrency(rec.monthly_income)}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setMonthlyIncome(rec.monthly_income)
                            setSelectedModel(rec.model_type)
                            setRecommendation(rec)
                            setActiveTab("generator")
                          }}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Budget</p>
                          <p className="font-medium">{formatCurrency(rec.total_budget)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Savings Target</p>
                          <p className="font-medium">{formatCurrency(rec.savings_target)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Categories</p>
                          <p className="font-medium">{rec.categories.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Risk Level</p>
                          <p className={`font-medium capitalize
                            ${rec.risk_level === "low" ? "text-green-500" :
                              rec.risk_level === "medium" ? "text-yellow-500" :
                              "text-red-500"
                            }`}
                          >
                            {rec.risk_level}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

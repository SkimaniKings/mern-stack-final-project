import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon, BarChart3Icon, PieChartIcon, TrendingUpIcon } from "lucide-react"
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react"
import { getClientSupabaseClient } from "@/lib/supabase/client"
import { getAuthenticatedUser } from "@/lib/auth"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"

interface Subscription {
  id: string
  name: string
  category: string
  cost: number
  usage: number
  value: number
  billing_cycle: string
  next_billing_date: string
}

interface ROIAnalysis {
  subscription: Subscription
  monthlyCost: number
  costPerUse: number
  valueScore: number
  roiPercentage: number
  valueRatio: number
  utilization: number
  optimizationPotential: number
  recommendation: string
  actionItems: string[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function SubscriptionROICalculator() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [roiAnalysis, setRoiAnalysis] = useState<ROIAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [totalMonthlyCost, setTotalMonthlyCost] = useState(0)
  const [totalValueScore, setTotalValueScore] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    fetchSubscriptions()
  }, [refreshTrigger])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get authenticated user
      const user = await getAuthenticatedUser()
      if (!user) {
        throw new Error("Not authenticated")
      }

      const supabase = getClientSupabaseClient()
      
      // Fetch user subscriptions with proper table name and error handling
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("cost", { ascending: false })

      if (subscriptionsError) {
        console.error("Error fetching subscriptions:", subscriptionsError)
        throw new Error("Failed to load subscription data. Please try again.")
      }
      
      if (!subscriptionsData || subscriptionsData.length === 0) {
        setSubscriptions([])
        setRoiAnalysis([])
        setTotalMonthlyCost(0)
        setTotalValueScore(0)
        return
      }

      // Normalize and validate subscription data
      const normalizedSubscriptions = subscriptionsData.map(sub => ({
        id: sub.id,
        name: sub.name || 'Unnamed Subscription',
        category: sub.category || 'Other',
        cost: typeof sub.cost === 'number' ? sub.cost : parseFloat(sub.cost || sub.amount) || 0,
        usage: typeof sub.usage_score === 'number' ? sub.usage_score : 50, // Default to 50% if not set
        value: typeof sub.value_score === 'number' ? sub.value_score : 50, // Default to 50% if not set
        billing_cycle: sub.billing_cycle || 'monthly',
        next_billing_date: sub.next_billing_date || new Date().toISOString().split('T')[0]
      }))

      // Calculate ROI analysis for each subscription
      const analysis = normalizedSubscriptions.map(sub => calculateROIAnalysis(sub))
      setSubscriptions(normalizedSubscriptions)
      setRoiAnalysis(analysis)

      // Calculate totals with proper error handling
      const totalCost = normalizedSubscriptions.reduce((sum, sub) => {
        let monthlyCost = sub.cost
        try {
          if (sub.billing_cycle === "quarterly") {
            monthlyCost = sub.cost / 3
          } else if (sub.billing_cycle === "annually" || sub.billing_cycle === "yearly") {
            monthlyCost = sub.cost / 12
          } else if (sub.billing_cycle === "semi-annually") {
            monthlyCost = sub.cost / 6
          } else if (sub.billing_cycle === "weekly") {
            monthlyCost = sub.cost * 4.33 // Average weeks per month
          } else if (sub.billing_cycle === "biweekly") {
            monthlyCost = sub.cost * 2.17 // Average bi-weeks per month
          }
        } catch (e) {
          console.error("Error calculating monthly cost for subscription:", sub.name, e)
          monthlyCost = sub.cost // Default to original cost if calculation fails
        }
        return sum + monthlyCost
      }, 0)

      const totalValue = analysis.reduce((sum, a) => sum + a.valueScore, 0)
      const avgValue = analysis.length > 0 ? totalValue / analysis.length : 0

      setTotalMonthlyCost(totalCost)
      setTotalValueScore(avgValue)
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
      setError(typeof error === 'string' ? error : error instanceof Error ? error.message : 'Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const calculateROIAnalysis = (sub: Subscription): ROIAnalysis => {
    // Calculate monthly cost based on billing cycle
    let monthlyCost = sub.cost
    if (sub.billing_cycle === 'annually' || sub.billing_cycle === 'yearly') {
      monthlyCost = sub.cost / 12
    } else if (sub.billing_cycle === 'quarterly') {
      monthlyCost = sub.cost / 3
    } else if (sub.billing_cycle === 'semi-annually' || sub.billing_cycle === 'bi-annual') {
      monthlyCost = sub.cost / 6
    } else if (sub.billing_cycle === 'biweekly') {
      monthlyCost = sub.cost * 2.17 // Average bi-weeks per month
    } else if (sub.billing_cycle === 'weekly') {
      monthlyCost = sub.cost * 4.33 // Average weeks per month
    }
    
    // Calculate cost per use (assuming usage is a percentage of optimal usage)
    const costPerUse = sub.usage > 0 
      ? monthlyCost / (sub.usage / 100) 
      : monthlyCost
    
    // Calculate value score (0-100)
    const valueScore = Math.round((sub.value / 100) * 100)
    
    // Calculate ROI percentage
    const roiPercentage = sub.usage > 0 
      ? Math.round((sub.value / sub.usage) * 100) 
      : 0
      
    // Calculate value ratio (value divided by cost, normalized)
    const valueRatio = sub.value > 0 && monthlyCost > 0
      ? (sub.value / 100) / (monthlyCost / 50) // Normalize to make 1.0 a "fair" value
      : 0
      
    // Calculate utilization (actual usage vs potential usage)
    const utilization = sub.usage / 100
    
    // Calculate optimization potential (how much could be saved or improved)
    const optimizationPotential = monthlyCost > 0
      ? Math.max(0, (1 - (utilization * valueRatio)) * 100)
      : 0
    
    // Generate recommendation and action items
    let recommendation = ""
    const actionItems: string[] = []
    
    if (sub.usage < 30 && monthlyCost > 10) {
      recommendation = "Consider canceling this subscription due to low usage."
      actionItems.push("Review alternatives with lower cost or free tiers")
      actionItems.push("Set a calendar reminder to cancel before next renewal")
    } else if (sub.usage < 50 && monthlyCost > 15) {
      recommendation = "Evaluate if this subscription can be shared or downgraded to a cheaper plan."
      actionItems.push("Check if a family or group plan is available")
      actionItems.push("Look for seasonal promotions or annual payment discounts")
    } else if (roiPercentage < 80) {
      recommendation = "Look for alternatives with better value for your needs."
      actionItems.push("Research competitor offerings and pricing")
      actionItems.push("Consider if you need all features or could use a simpler plan")
    } else if (roiPercentage > 120) {
      recommendation = "Great value! Consider upgrading if you use this service frequently."
      actionItems.push("Set reminders to use this subscription more often")
      actionItems.push("Check if premium features would provide even more value")
    } else {
      recommendation = "This subscription provides fair value for the cost."
      actionItems.push("Review usage patterns to maximize value")
      actionItems.push("Set a calendar reminder to review before renewal")
    }
    
    return {
      subscription: sub,
      monthlyCost,
      costPerUse,
      valueScore,
      roiPercentage,
      valueRatio,
      utilization,
      optimizationPotential,
      recommendation,
      actionItems
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getValueColor = (value: number) => {
    if (value >= 80) return "text-green-600"
    if (value >= 50) return "text-yellow-600"
    return "text-red-600"
  }

  const getROIColor = (roi: number) => {
    if (roi >= 150) return "text-green-600"
    if (roi >= 100) return "text-yellow-600"
    return "text-red-600"
  }

  // Prepare data for charts
  const valueVsCostData = roiAnalysis.map(item => ({
    name: item.subscription.name,
    value: item.valueScore,
    cost: item.monthlyCost,
    roi: item.roiPercentage
  }))

  const categoryData = roiAnalysis.reduce((acc: any[], item) => {
    const existingCategory = acc.find(cat => cat.name === item.subscription.category)
    
    if (existingCategory) {
      existingCategory.value += item.monthlyCost
    } else {
      acc.push({
        name: item.subscription.category,
        value: item.monthlyCost
      })
    }
    
    return acc
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3Icon className="h-5 w-5 text-blue-500" />
          Subscription ROI Calculator
        </CardTitle>
        <CardDescription>
          Analyze the value and return on investment of your subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Monthly Cost</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalMonthlyCost)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Average Value Score</div>
                  <div className="text-2xl font-bold">{totalValueScore.toFixed(1)}/100</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Subscriptions</div>
                  <div className="text-2xl font-bold">{subscriptions.length}</div>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="overview" onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="charts">Charts</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                {roiAnalysis.length === 0 ? (
                  <Alert>
                    <InfoIcon className="h-5 w-5" />
                    <AlertTitle>No subscriptions found</AlertTitle>
                    <AlertDescription>
                      Add subscriptions to see ROI analysis and recommendations.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {roiAnalysis.map((analysis, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg shadow-sm border">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-medium">{analysis.subscription.name}</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(analysis.monthlyCost)} / month
                              </p>
                              {analysis.subscription.category && (
                                <Badge variant="outline" className="text-xs">
                                  {analysis.subscription.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {analysis.roiPercentage >= 100 ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : analysis.roiPercentage >= 80 ? (
                              <TrendingUp className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            )}
                            <span
                              className={`font-medium ${
                                analysis.roiPercentage >= 100
                                  ? "text-green-600"
                                  : analysis.roiPercentage >= 80
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }`}
                            >
                              {analysis.roiPercentage}% ROI
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Value Ratio</p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${
                                  analysis.valueRatio >= 1.5
                                    ? "bg-green-500"
                                    : analysis.valueRatio >= 0.8
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(100, analysis.valueRatio * 50)}%` }}
                              ></div>
                            </div>
                            <p className="text-right text-xs text-muted-foreground mt-1">
                              {analysis.valueRatio.toFixed(2)}x
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Utilization</p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${
                                  analysis.utilization >= 0.75
                                    ? "bg-green-500"
                                    : analysis.utilization >= 0.4
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${analysis.utilization * 100}%` }}
                              ></div>
                            </div>
                            <p className="text-right text-xs text-muted-foreground mt-1">
                              {(analysis.utilization * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Optimization Potential</p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${
                                  analysis.optimizationPotential <= 20
                                    ? "bg-green-500"
                                    : analysis.optimizationPotential <= 50
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${analysis.optimizationPotential}%` }}
                              ></div>
                            </div>
                            <p className="text-right text-xs text-muted-foreground mt-1">
                              {analysis.optimizationPotential.toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-4 text-sm">
                          <p className="font-medium">{analysis.recommendation}</p>
                          <ul className="mt-2 text-xs text-muted-foreground space-y-1 list-disc pl-4">
                            {analysis.actionItems.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="analysis" className="space-y-4">
                {roiAnalysis.length === 0 ? (
                  <Alert>
                    <InfoIcon className="h-5 w-5" />
                    <AlertTitle>No subscriptions found</AlertTitle>
                    <AlertDescription>
                      Add subscriptions to see detailed ROI analysis.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Subscription</th>
                          <th className="text-right py-2 px-4">Monthly Cost</th>
                          <th className="text-right py-2 px-4">Usage %</th>
                          <th className="text-right py-2 px-4">Value Score</th>
                          <th className="text-right py-2 px-4">ROI %</th>
                          <th className="text-right py-2 px-4">Cost/Use</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roiAnalysis.map((analysis, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 px-4">{analysis.subscription.name}</td>
                            <td className="text-right py-2 px-4">{formatCurrency(analysis.monthlyCost)}</td>
                            <td className="text-right py-2 px-4">{analysis.subscription.usage}%</td>
                            <td className={`text-right py-2 px-4 ${getValueColor(analysis.valueScore)}`}>
                              {analysis.valueScore}
                            </td>
                            <td className={`text-right py-2 px-4 ${getROIColor(analysis.roiPercentage)}`}>
                              {analysis.roiPercentage}%
                            </td>
                            <td className="text-right py-2 px-4">{formatCurrency(analysis.costPerUse)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="charts" className="space-y-6">
                {roiAnalysis.length === 0 ? (
                  <Alert>
                    <InfoIcon className="h-5 w-5" />
                    <AlertTitle>No subscriptions found</AlertTitle>
                    <AlertDescription>
                      Add subscriptions to see visualizations.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="h-80">
                      <h3 className="text-lg font-medium mb-4">Value vs. Cost</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={valueVsCostData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="value" name="Value Score" fill="#8884d8" />
                          <Bar yAxisId="right" dataKey="cost" name="Monthly Cost" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="h-80">
                      <h3 className="text-lg font-medium mb-4">Cost by Category</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
        
        {/* Add a refresh button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
            disabled={loading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`${loading ? 'animate-spin' : ''}`}
            >
              <path d="M21 12a9 9 0 0 1-9 9" />
              <path d="M3 12a9 9 0 0 1 9-9" />
              <path d="M21 12a9 9 0 0 0-9 9" />
              <path d="M3 12a9 9 0 0 0 9-9" />
            </svg>
            Refresh Data
          </button>
        </div>
      </CardContent>
    </Card>
  )
} 
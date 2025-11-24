"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InfoIcon, TrendingUp, Wallet, PieChart as PieChartIcon, Shield, AlertTriangle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts"
import { calculateIncomeDiversification } from "@/app/actions/income-sources"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DiversificationScore() {
  const [score, setScore] = useState<number | null>(null)
  const [breakdown, setBreakdown] = useState<any[] | null>(null)
  const [metrics, setMetrics] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await calculateIncomeDiversification()
        console.log("Diversification result:", result)
        
        // Update to use the correct field name from the API response
        setScore(result.overall_score)
        
        // Store additional metrics
        setMetrics({
          sourceCount: result.source_count,
          primaryDependency: result.primary_dependency,
          stabilityScore: result.stability_score,
          growthPotential: result.growth_potential
        })
        
        // Transform the breakdown data for the pie chart
        if (result.breakdown && Array.isArray(result.breakdown)) {
          const chartData = result.breakdown.map(item => ({
            name: item.source_name,
            percentage: item.percentage,
            value: item.percentage, // For the pie chart
            scoreContribution: item.score_contribution
          }))
          setBreakdown(chartData)
        }
      } catch (err) {
        console.error("Error fetching diversification score:", err)
        setError("Error fetching diversification score")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate colors and status based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    if (score >= 40) return "text-orange-500"
    return "text-red-500"
  }

  const getScoreStatus = (score: number) => {
    if (score >= 80) return "Excellent"
    if (score >= 60) return "Good"
    if (score >= 40) return "Fair"
    return "Needs Improvement"
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/20"
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/20"
    if (score >= 40) return "bg-orange-100 dark:bg-orange-900/20"
    return "bg-red-100 dark:bg-red-900/20"
  }

  const COLORS = [
    "#4ade80", // green
    "#60a5fa", // blue
    "#f97316", // orange
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#facc15", // yellow
    "#06b6d4", // cyan
    "#f43f5e"  // red
  ]

  const getRecommendations = () => {
    if (!score || !metrics || !breakdown) return []
    
    const recommendations = []
    
    // Add source count recommendation
    if (metrics.sourceCount < 3) {
      recommendations.push({
        title: "Add more income sources",
        description: "Aim for at least 3-5 different income sources to improve stability",
        icon: <TrendingUp className="h-4 w-4" />,
        priority: "high"
      })
    }
    
    // Add primary dependency recommendation
    if (metrics.primaryDependency > 70) {
      recommendations.push({
        title: "Reduce reliance on primary income",
        description: `Your largest income source accounts for ${Math.round(metrics.primaryDependency)}% of your total income`,
        icon: <AlertTriangle className="h-4 w-4" />,
        priority: "high"
      })
    }
    
    // Add passive income recommendation
    const hasPassiveIncome = breakdown.some(item => 
      item.name.toLowerCase().includes("passive") || 
      item.name.toLowerCase().includes("investment")
    )
    
    if (!hasPassiveIncome) {
      recommendations.push({
        title: "Add passive income streams",
        description: "Passive income improves your financial resilience and long-term stability",
        icon: <Wallet className="h-4 w-4" />,
        priority: "medium"
      })
    }
    
    // Add diversification recommendation
    if (metrics.sourceCount >= 3 && metrics.primaryDependency < 60 && score < 70) {
      recommendations.push({
        title: "Balance your income sources",
        description: "Try to make your income sources more evenly distributed",
        icon: <PieChartIcon className="h-4 w-4" />,
        priority: "medium"
      })
    }
    
    return recommendations
  }

  if (loading) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Income Diversification</CardTitle>
          <CardDescription>How well your income is diversified</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || score === null || !breakdown) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Income Diversification</CardTitle>
          <CardDescription>How well your income is diversified</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <p className="text-muted-foreground text-center">{error || "Failed to calculate income diversification"}</p>
        </CardContent>
      </Card>
    )
  }

  const scoreColor = getScoreColor(score)
  const scoreStatus = getScoreStatus(score)
  const scoreBgColor = getScoreBgColor(score)
  const recommendations = getRecommendations()

  return (
    <Card className="dashboard-card animate-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Income Diversification</CardTitle>
            <CardDescription>How well your income is diversified</CardDescription>
          </div>
          <div className={`text-3xl font-bold ${scoreColor} flex items-center gap-2`}>
            <div className={`w-16 h-16 rounded-full ${scoreBgColor} flex items-center justify-center`}>
              <span>{score}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/2 space-y-4">
                <div className="flex items-center space-x-2">
                  <h3 className={`text-xl font-semibold ${scoreColor}`}>{scoreStatus}</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoIcon className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Your income diversification score is calculated based on the number of income sources,
                          their relative distribution, stability, and growth potential.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <p className="text-sm text-muted-foreground">
                  {score >= 80
                    ? "Your income is well diversified across multiple sources, providing excellent financial stability."
                    : score >= 60
                      ? "Your income has good diversification, but could benefit from adding more sources or balancing existing ones."
                      : score >= 40
                        ? "Your income diversification is fair, but you're relying too heavily on a few sources."
                        : "Your income lacks diversification, making you vulnerable to financial shocks if one source is disrupted."}
                </p>
                
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Income Sources</span>
                      <span className="font-medium">{metrics.sourceCount}</span>
                    </div>
                    <Progress value={Math.min(metrics.sourceCount * 20, 100)} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Primary Dependency</span>
                      <span className={metrics.primaryDependency > 70 ? "text-red-500" : "font-medium"}>
                        {Math.round(metrics.primaryDependency)}%
                      </span>
                    </div>
                    <Progress 
                      value={100 - metrics.primaryDependency} 
                      className="h-2"
                      indicatorClassName={metrics.primaryDependency > 70 ? "bg-red-500" : ""}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Stability Score</span>
                      <span className="font-medium">{metrics.stabilityScore}%</span>
                    </div>
                    <Progress value={metrics.stabilityScore} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Growth Potential</span>
                      <span className="font-medium">{metrics.growthPotential}%</span>
                    </div>
                    <Progress value={metrics.growthPotential} className="h-2" />
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-1/2">
                {breakdown.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        cx="50%" 
                        cy="50%" 
                        innerRadius="20%" 
                        outerRadius="90%" 
                        barSize={20} 
                        data={breakdown.map((item, index) => ({
                          ...item,
                          fill: COLORS[index % COLORS.length]
                        }))}
                      >
                        <RadialBar
                          background
                          dataKey="percentage"
                          label={{ position: 'insideStart', fill: '#fff', fontWeight: 'bold' }}
                        />
                        <RechartsTooltip
                          formatter={(value: number, name: string, props: any) => [
                            `${value.toFixed(1)}%`, 
                            props.payload.name
                          ]}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">No income sources to display</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                {breakdown.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={breakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => [`${value.toFixed(1)}%`, "Percentage"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">No income sources to display</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Income Distribution</h3>
                <div className="space-y-2">
                  {breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="recommendations" className="space-y-4">
            {recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div key={index} className="flex gap-3 p-3 border rounded-lg">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${rec.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}
                    `}>
                      {rec.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{rec.title}</h4>
                        <Badge variant={rec.priority === 'high' ? "destructive" : "secondary"}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">Great job!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your income diversification looks excellent. Keep up the good work!
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

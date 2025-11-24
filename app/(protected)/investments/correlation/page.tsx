"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getPortfolioCorrelation } from "@/app/actions/investments"

// Force dynamic rendering to handle cookies
export const dynamic = 'force-dynamic'

export default function CorrelationAnalysisPage() {
  const [correlationData, setCorrelationData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("matrix")

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const data = await getPortfolioCorrelation()
        setCorrelationData(data)
      } catch (error) {
        console.error("Error fetching correlation data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Helper function to get color based on correlation value
  const getCorrelationColor = (value: number) => {
    // Strong negative correlation: dark blue
    if (value <= -0.7) return "bg-blue-800 text-white"
    // Moderate negative correlation: light blue
    if (value <= -0.3) return "bg-blue-400 text-white"
    // Weak negative correlation: very light blue
    if (value < 0) return "bg-blue-200"
    // No correlation: white/neutral
    if (value === 0) return "bg-gray-100"
    // Weak positive correlation: very light red
    if (value < 0.3) return "bg-red-200"
    // Moderate positive correlation: light red
    if (value < 0.7) return "bg-red-400 text-white"
    // Strong positive correlation: dark red
    return "bg-red-800 text-white"
  }

  // Render correlation matrix
  const renderCorrelationMatrix = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
        </div>
      )
    }

    if (!correlationData || !correlationData.investments || correlationData.investments.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No investments found to analyze correlation.</p>
          <Button className="mt-4" asChild>
            <Link href="/investments">Add Investments</Link>
          </Button>
        </div>
      )
    }

    const { investments, correlationMatrix } = correlationData

    return (
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Investment</TableHead>
              {investments.map((inv: any) => (
                <TableHead key={inv.id} className="text-center min-w-[100px]">
                  {inv.name.length > 10 ? `${inv.name.substring(0, 10)}...` : inv.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.map((inv: any, rowIndex: number) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">
                  {inv.name}
                  {inv.ticker && <span className="text-xs text-muted-foreground ml-1">({inv.ticker})</span>}
                </TableCell>
                {investments.map((_: any, colIndex: number) => (
                  <TableCell 
                    key={`${rowIndex}-${colIndex}`} 
                    className={`text-center ${getCorrelationColor(correlationMatrix[rowIndex][colIndex])}`}
                  >
                    {correlationMatrix[rowIndex][colIndex].toFixed(2)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Render diversification analysis
  const renderDiversificationAnalysis = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full" />
        </div>
      )
    }

    if (!correlationData || !correlationData.investments || correlationData.investments.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No investments found to analyze diversification.</p>
        </div>
      )
    }

    const { diversificationScore, averageCorrelations } = correlationData

    // Sort investments by average correlation (lowest first)
    const sortedInvestments = [...averageCorrelations].sort((a, b) => 
      a.average_correlation - b.average_correlation
    )

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Diversification Score</CardTitle>
              <CardDescription>Overall portfolio diversification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">
                {(diversificationScore * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {diversificationScore >= 0.7 ? 'Excellent diversification' : 
                 diversificationScore >= 0.5 ? 'Good diversification' : 
                 diversificationScore >= 0.3 ? 'Moderate diversification' : 
                 'Poor diversification'}
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-4">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${diversificationScore * 100}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Interpretation</CardTitle>
              <CardDescription>What your diversification score means</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li><span className="font-medium">90-100%:</span> Excellent diversification across asset classes</li>
                <li><span className="font-medium">70-89%:</span> Very good diversification with minimal correlation</li>
                <li><span className="font-medium">50-69%:</span> Good diversification with some correlated assets</li>
                <li><span className="font-medium">30-49%:</span> Moderate diversification, consider rebalancing</li>
                <li><span className="font-medium">0-29%:</span> Poor diversification, high risk of correlated losses</li>
              </ul>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Investment Correlations</CardTitle>
            <CardDescription>Average correlation of each investment with the rest of your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Avg. Correlation</TableHead>
                  <TableHead>Diversification Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvestments.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.name}
                      {inv.ticker && <span className="text-xs text-muted-foreground ml-1">({inv.ticker})</span>}
                    </TableCell>
                    <TableCell>{inv.investment_type}</TableCell>
                    <TableCell className="text-right">
                      <span className={inv.average_correlation < 0.3 ? "text-green-600" : 
                                       inv.average_correlation < 0.7 ? "text-amber-600" : 
                                       "text-red-600"}>
                        {inv.average_correlation.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {inv.average_correlation < 0.3 ? "Strong diversifier" : 
                       inv.average_correlation < 0.5 ? "Good diversifier" : 
                       inv.average_correlation < 0.7 ? "Moderate diversifier" : 
                       "Poor diversifier"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Correlation Analysis</h1>
          <p className="text-muted-foreground">
            Analyze how your investments move in relation to each other
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/investments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Investments
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix">Correlation Matrix</TabsTrigger>
          <TabsTrigger value="diversification">Diversification Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Investment Correlation Matrix</CardTitle>
              <CardDescription>
                How your investments move in relation to each other. Values range from -1 (perfect negative correlation) to +1 (perfect positive correlation).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderCorrelationMatrix()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="diversification" className="space-y-4">
          {renderDiversificationAnalysis()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

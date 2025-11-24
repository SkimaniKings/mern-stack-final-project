"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils/formatting"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { useEffect, useState } from "react"
import { calculateRebalancingRecommendations } from "@/app/actions/investments"

interface AssetClass {
  id: string
  name: string
  targetAllocation: number
  currentAllocation: number
}

interface RebalancingRecommendation {
  assetClass: AssetClass
  targetAllocation: number
  currentAllocation: number
  difference: number
  action: "buy" | "sell" | "hold"
  amountToRebalance: number
}

interface RebalancingTableProps {
  initialRecommendations?: RebalancingRecommendation[]
  initialTotalPortfolioValue?: number
}

export function RebalancingTable({ initialRecommendations, initialTotalPortfolioValue }: RebalancingTableProps) {
  const [recommendations, setRecommendations] = useState<RebalancingRecommendation[]>(initialRecommendations || [])
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(initialTotalPortfolioValue || 0)
  const [isLoading, setIsLoading] = useState(!initialRecommendations)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialRecommendations) {
      const fetchRecommendations = async () => {
        try {
          setIsLoading(true)
          setError(null)
          
          const data = await calculateRebalancingRecommendations()
          
          if (data && Array.isArray(data.recommendations)) {
            setRecommendations(data.recommendations)
            setTotalPortfolioValue(data.totalPortfolioValue || 0)
          } else {
            console.error("Invalid data format from calculateRebalancingRecommendations:", data)
            setRecommendations([])
            setError("Could not load rebalancing recommendations. Please try again later.")
          }
        } catch (error) {
          console.error("Error fetching rebalancing recommendations:", error)
          setRecommendations([])
          setError("Could not load rebalancing recommendations. Please try again later.")
        } finally {
          setIsLoading(false)
        }
      }

      fetchRecommendations()
    }
  }, [initialRecommendations])

  // Sort recommendations by absolute difference (largest first)
  const sortedRecommendations = [...recommendations].sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading rebalancing recommendations...</div>
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>
  }

  if (sortedRecommendations.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">No rebalancing recommendations available. Add investments to see recommendations.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset Class</TableHead>
            <TableHead>Current</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Difference</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRecommendations.map((rec) => {
            // Skip invalid recommendations
            if (!rec || !rec.assetClass || !rec.assetClass.name) {
              return null
            }
            
            return (
              <TableRow key={rec.assetClass.id || `asset-${Math.random().toString(36).substring(2, 9)}`}>
                <TableCell className="font-medium">{rec.assetClass.name}</TableCell>
                <TableCell>{(rec.currentAllocation || 0).toFixed(1)}%</TableCell>
                <TableCell>{(rec.targetAllocation || 0).toFixed(1)}%</TableCell>
                <TableCell>
                  <span className={rec.difference > 0 ? "text-green-600" : rec.difference < 0 ? "text-red-600" : ""}>
                    {rec.difference > 0 ? "+" : ""}
                    {(rec.difference || 0).toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell>
                  {rec.action === "buy" ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      <ArrowUp className="mr-1 h-3 w-3" />
                      Buy
                    </Badge>
                  ) : rec.action === "sell" ? (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                      <ArrowDown className="mr-1 h-3 w-3" />
                      Sell
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Minus className="mr-1 h-3 w-3" />
                      Hold
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {rec.action !== "hold" ? formatCurrency(rec.amountToRebalance || 0) : "-"}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {totalPortfolioValue > 0 && (
        <div className="text-sm text-right text-muted-foreground">
          Total Portfolio Value: {formatCurrency(totalPortfolioValue)}
        </div>
      )}

      <div className="p-4 border rounded-lg bg-muted/50">
        <h3 className="font-medium mb-2">Rebalancing Strategy</h3>
        <ul className="space-y-2 text-sm">
          <li>• Consider rebalancing when asset classes drift more than 5% from target allocation</li>
          <li>• Use new contributions to buy underweight asset classes first</li>
          <li>• Sell overweight asset classes in tax-advantaged accounts when possible to avoid tax consequences</li>
          <li>• Rebalance at least annually or after significant market movements</li>
        </ul>
      </div>
    </div>
  )
}

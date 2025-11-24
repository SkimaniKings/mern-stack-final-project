"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownIcon, ArrowUpIcon, RefreshCwIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"

interface RebalancingRecommendationsProps {
  recommendations: any
  portfolioValue: number
}

export function RebalancingRecommendations({ recommendations, portfolioValue }: RebalancingRecommendationsProps) {
  const [showAllTypes, setShowAllTypes] = useState(false)

  const typesToShow = showAllTypes
    ? Object.keys(recommendations.differences)
    : Object.keys(recommendations.differences).filter(
        (type) => Math.abs(recommendations.differences[type].difference) >= 2,
      )

  return (
    <div className="space-y-6">
      <Card
        className={recommendations.needsRebalancing ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCwIcon className={recommendations.needsRebalancing ? "text-amber-500" : "text-green-500"} />
            {recommendations.needsRebalancing ? "Portfolio Rebalancing Recommended" : "Portfolio is Well Balanced"}
          </CardTitle>
          <CardDescription>
            {recommendations.needsRebalancing
              ? `Your portfolio has drifted ${recommendations.totalDifference.toFixed(2)}% from your target allocation`
              : "Your current allocation is within 5% of your targets"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.needsRebalancing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.recommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      recommendation.action === "reduce"
                        ? "bg-red-100 border border-red-200"
                        : "bg-green-100 border border-green-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {recommendation.action === "reduce" ? (
                        <TrendingDownIcon className="text-red-500 mt-0.5" />
                      ) : (
                        <TrendingUpIcon className="text-green-500 mt-0.5" />
                      )}
                      <div>
                        <h4 className="font-medium">{recommendation.message}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {recommendation.action === "reduce"
                            ? `Consider selling approximately $${(recommendations.rebalanceAmounts[recommendation.type]).toFixed(2)} of your ${recommendation.type} investments`
                            : `Consider buying approximately $${Math.abs(recommendations.rebalanceAmounts[recommendation.type]).toFixed(2)} of ${recommendation.type} investments`}
                        </p>

                        {recommendation.action === "reduce" && recommendation.investments && (
                          <div className="mt-2">
                            <p className="text-xs font-medium mb-1">Suggested investments to reduce:</p>
                            <div className="flex flex-wrap gap-1">
                              {recommendation.investments.map((investment, i) => (
                                <Badge key={i} variant="outline" className="bg-white">
                                  {investment.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {recommendation.action === "increase" && recommendation.suggestedInvestments && (
                          <div className="mt-2">
                            <p className="text-xs font-medium mb-1">Suggested investments to add:</p>
                            <div className="flex flex-wrap gap-1">
                              {recommendation.suggestedInvestments.map((investment, i) => (
                                <Badge key={i} variant="outline" className="bg-white">
                                  {investment.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" asChild>
                <Link href="/investments/allocation?tab=targets">Adjust Targets</Link>
              </Button>
              <Button asChild>
                <Link href="/investments/rebalance">Rebalance Portfolio</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allocation Differences</CardTitle>
          <CardDescription>Comparison of your current allocation to your targets</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead className="text-right">Amount to Adjust</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typesToShow.map((type) => {
                const { target, current, difference } = recommendations.differences[type]
                const amountToAdjust = recommendations.rebalanceAmounts[type]

                return (
                  <TableRow key={type}>
                    <TableCell className="font-medium">{type}</TableCell>
                    <TableCell>{target.toFixed(2)}%</TableCell>
                    <TableCell>{current.toFixed(2)}%</TableCell>
                    <TableCell>
                      <div
                        className={`flex items-center gap-1 ${
                          difference > 5
                            ? "text-red-500"
                            : difference < -5
                              ? "text-red-500"
                              : difference > 2
                                ? "text-amber-500"
                                : difference < -2
                                  ? "text-amber-500"
                                  : "text-green-500"
                        }`}
                      >
                        {difference > 0 ? (
                          <ArrowUpIcon className="h-4 w-4" />
                        ) : difference < 0 ? (
                          <ArrowDownIcon className="h-4 w-4" />
                        ) : null}
                        {Math.abs(difference).toFixed(2)}%
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.abs(amountToAdjust) > 1 ? (
                        <Badge variant={amountToAdjust > 0 ? "destructive" : "outline"}>
                          {amountToAdjust > 0 ? "-" : "+"} ${Math.abs(amountToAdjust).toFixed(2)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          No change needed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {!showAllTypes && Object.keys(recommendations.differences).length > typesToShow.length && (
            <Button variant="link" onClick={() => setShowAllTypes(true)} className="mt-2">
              Show all asset types
            </Button>
          )}

          {showAllTypes && typesToShow.length > 3 && (
            <Button variant="link" onClick={() => setShowAllTypes(false)} className="mt-2">
              Show only significant differences
            </Button>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-sm text-muted-foreground">
            Rebalancing is typically recommended when allocation differences exceed 5%
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}


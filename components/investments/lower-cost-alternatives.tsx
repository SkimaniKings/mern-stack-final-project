"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLinkIcon } from "lucide-react"

interface LowerCostAlternativesProps {
  highFeeInvestments: any[]
}

export function LowerCostAlternatives({ highFeeInvestments }: LowerCostAlternativesProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  // Sort by potential savings (highest first)
  const sortedInvestments = [...highFeeInvestments].sort((a, b) => {
    const aBestSavings = a.alternatives[0]?.potential_savings || 0
    const bBestSavings = b.alternatives[0]?.potential_savings || 0
    return bBestSavings - aBestSavings
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {sortedInvestments.map((investment) => (
          <Card key={investment.id} className="overflow-hidden">
            <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleItem(investment.id)}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{investment.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {investment.accounts?.name || "Unknown Account"} • ${investment.current_value.toFixed(2)} value
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="destructive">{investment.fee_percentage.toFixed(2)}% expense ratio</Badge>
                  <p className="text-sm mt-1">${investment.annual_fee.toFixed(2)}/year in fees</p>
                </div>
              </div>

              {investment.alternatives.length > 0 && (
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-green-600 font-medium">
                    Save up to ${investment.alternatives[0].potential_savings.toFixed(2)}/year with alternatives
                  </div>
                  <Button variant="ghost" size="sm">
                    {expandedItems.includes(investment.id) ? "Hide" : "Show"} Alternatives
                  </Button>
                </div>
              )}
            </div>

            {expandedItems.includes(investment.id) && (
              <div className="border-t">
                <div className="p-4 bg-gray-50">
                  <h4 className="text-sm font-medium mb-2">Lower-Cost Alternatives</h4>
                  <div className="space-y-3">
                    {investment.alternatives.map((alternative, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{alternative.name}</h5>
                            <p className="text-xs text-muted-foreground">{alternative.ticker}</p>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {alternative.expense_ratio.toFixed(2)}% expense ratio
                          </Badge>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Annual Fee</p>
                            <p className="font-medium">${alternative.new_annual_fee.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Annual Savings</p>
                            <p className="font-medium text-green-600">${alternative.potential_savings.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-between items-center">
                          <div className="text-xs text-muted-foreground">
                            {alternative.savings_percentage.toFixed(0)}% lower fees than current investment
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              href={`https://www.google.com/search?q=${alternative.ticker}+fund+information`}
                              target="_blank"
                            >
                              Research
                              <ExternalLinkIcon className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}


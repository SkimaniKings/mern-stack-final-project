"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/investments/calculations"

interface TaxLossHarvestingTableProps {
  opportunities: {
    investment: {
      id: string
      name: string
      ticker?: string
      type: string
      value: number
      costBasis: number
    }
    unrealizedLoss: number
    unrealizedLossPercent: number
    harvestingBenefit: number
    alternatives?: string[]
  }[]
}

export function TaxLossHarvestingTable({ opportunities }: TaxLossHarvestingTableProps) {
  // Sort opportunities by harvesting benefit (highest first)
  const sortedOpportunities = [...opportunities].sort((a, b) => b.harvestingBenefit - a.harvestingBenefit)

  return (
    <div className="space-y-4">
      {sortedOpportunities.length === 0 ? (
        <div className="text-center p-4 border rounded-lg">
          <p className="text-muted-foreground">No tax-loss harvesting opportunities found.</p>
          <p className="text-sm">This is good news! Your investments are performing well.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investment</TableHead>
              <TableHead>Current Value</TableHead>
              <TableHead>Cost Basis</TableHead>
              <TableHead>Unrealized Loss</TableHead>
              <TableHead>Tax Benefit</TableHead>
              <TableHead>Alternatives</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOpportunities.map((opportunity) => (
              <TableRow key={opportunity.investment.id}>
                <TableCell className="font-medium">
                  {opportunity.investment.name}
                  {opportunity.investment.ticker && (
                    <span className="text-muted-foreground ml-1">({opportunity.investment.ticker})</span>
                  )}
                </TableCell>
                <TableCell>{formatCurrency(opportunity.investment.value)}</TableCell>
                <TableCell>{formatCurrency(opportunity.investment.costBasis)}</TableCell>
                <TableCell className="text-red-600">
                  {formatCurrency(opportunity.unrealizedLoss)} ({opportunity.unrealizedLossPercent.toFixed(1)}%)
                </TableCell>
                <TableCell className="font-medium text-green-600">
                  {formatCurrency(opportunity.harvestingBenefit)}
                </TableCell>
                <TableCell>
                  {opportunity.alternatives ? (
                    <div className="flex flex-wrap gap-1">
                      {opportunity.alternatives.map((alt, index) => (
                        <Badge key={index} variant="outline">
                          {alt}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="p-4 border rounded-lg bg-muted/50">
        <h3 className="font-medium mb-2">Tax-Loss Harvesting Guidelines</h3>
        <ul className="space-y-1 text-sm">
          <li>• Harvest losses to offset capital gains and up to $3,000 of ordinary income</li>
          <li>• Be aware of wash sale rules: don't repurchase substantially identical securities within 30 days</li>
          <li>• Consider tax-efficient alternatives that provide similar market exposure</li>
          <li>• Maintain your strategic asset allocation when replacing investments</li>
          <li>• Consult with a tax professional before implementing tax-loss harvesting strategies</li>
        </ul>
      </div>
    </div>
  )
}

